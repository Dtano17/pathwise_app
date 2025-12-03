import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import { apifyService } from './apifyService';

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INSTAGRAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Ch-Ua': '"Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

const TIKTOK_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate'
};

const IG_APP_ID = '936619743392459';

export interface SocialMediaContent {
  platform: string;
  url: string;
  audioTranscript?: string;
  ocrText?: string;
  caption?: string;
  metadata?: {
    title?: string;
    author?: string;
    duration?: number;
    mediaCount?: number;
  };
  carouselItems?: Array<{
    type: 'image' | 'video';
    ocrText?: string;
    transcript?: string;
  }>;
  success: boolean;
  error?: string;
}

interface YtDlpInfo {
  title?: string;
  uploader?: string;
  duration?: number;
  description?: string;
  entries?: YtDlpInfo[];
  ext?: string;
  url?: string;
}

const SUPPORTED_PLATFORMS = {
  instagram: /instagram\.com\/(reel|p|stories)\//i,
  tiktok: /tiktok\.com\/@?[\w.-]+\/video\//i,
  youtube: /(?:youtube\.com\/(?:watch\?|shorts\/)|youtu\.be\/)/i,
  twitter: /(?:twitter\.com|x\.com)\/[\w]+\/status\//i,
  facebook: /facebook\.com\/(?:watch|reel|[\w.]+\/videos)\//i,
  reddit: /reddit\.com\/r\/[\w]+\/comments\//i,
};

class SocialMediaVideoService {
  private tempDir: string;

  constructor() {
    this.tempDir = '/tmp/social_media_videos';
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  detectPlatform(url: string): string | null {
    for (const [platform, pattern] of Object.entries(SUPPORTED_PLATFORMS)) {
      if (pattern.test(url)) {
        return platform;
      }
    }
    return null;
  }

  async extractContent(url: string): Promise<SocialMediaContent> {
    const platform = this.detectPlatform(url);
    
    if (!platform) {
      return {
        platform: 'unknown',
        url,
        success: false,
        error: 'Unsupported platform. Supported: Instagram, TikTok, YouTube, Twitter/X, Facebook, Reddit'
      };
    }

    console.log(`[SOCIAL_MEDIA] Extracting content from ${platform}: ${url}`);

    try {
      let downloadResult;
      
      if (platform === 'instagram') {
        if (apifyService.isAvailable()) {
          console.log(`[SOCIAL_MEDIA] Using Apify for Instagram extraction (reliable, no rate limits)...`);
          downloadResult = await this.extractViaApifyInstagram(url);
        }
        
        if (!downloadResult?.success) {
          console.log(`[SOCIAL_MEDIA] Apify failed or unavailable, trying direct extraction...`);
          downloadResult = await this.extractDirectFromInstagram(url);
        }
        
        if (!downloadResult.success) {
          console.log(`[SOCIAL_MEDIA] Direct extraction failed, falling back to yt-dlp...`);
          downloadResult = await this.downloadMedia(url, platform);
        }
      } else if (platform === 'tiktok') {
        if (apifyService.isAvailable()) {
          console.log(`[SOCIAL_MEDIA] Using Apify for TikTok extraction (reliable, no rate limits)...`);
          downloadResult = await this.extractViaApifyTikTok(url);
        }
        
        if (!downloadResult?.success) {
          console.log(`[SOCIAL_MEDIA] Apify failed or unavailable, trying direct extraction...`);
          downloadResult = await this.extractDirectFromTikTok(url);
        }
        
        if (!downloadResult.success) {
          console.log(`[SOCIAL_MEDIA] Direct extraction failed, falling back to yt-dlp...`);
          downloadResult = await this.downloadMedia(url, platform);
        }
      } else {
        downloadResult = await this.downloadMedia(url, platform);
      }
      
      if (!downloadResult.success) {
        return {
          platform,
          url,
          success: false,
          error: downloadResult.error || 'Failed to download media'
        };
      }

      const result: SocialMediaContent = {
        platform,
        url,
        success: true,
        metadata: downloadResult.metadata,
        caption: downloadResult.caption
      };

      if (downloadResult.isCarousel && downloadResult.carouselFiles) {
        result.carouselItems = [];
        for (const file of downloadResult.carouselFiles) {
          const itemResult = await this.processMediaFile(file.path, file.type);
          result.carouselItems.push({
            type: file.type,
            ocrText: itemResult.ocrText,
            transcript: itemResult.transcript
          });
          this.cleanupFile(file.path);
        }
      } else if (downloadResult.filePath) {
        const mediaType = downloadResult.mediaType || 'video';
        const processed = await this.processMediaFile(downloadResult.filePath, mediaType);
        result.audioTranscript = processed.transcript;
        result.ocrText = processed.ocrText;
        this.cleanupFile(downloadResult.filePath);
      }

      return result;

    } catch (error: any) {
      console.error(`[SOCIAL_MEDIA] Error extracting from ${platform}:`, error);
      return {
        platform,
        url,
        success: false,
        error: error.message || 'Failed to extract content'
      };
    }
  }

  private async extractViaApifyInstagram(url: string): Promise<{
    success: boolean;
    filePath?: string;
    mediaType?: 'video' | 'image';
    isCarousel?: boolean;
    carouselFiles?: Array<{ path: string; type: 'video' | 'image' }>;
    caption?: string;
    metadata?: any;
    error?: string;
  }> {
    const apifyResult = await apifyService.extractInstagramReel(url);
    
    if (!apifyResult.success) {
      return { success: false, error: apifyResult.error };
    }

    const caption = apifyResult.caption;
    const metadata = {
      author: apifyResult.author?.username,
      title: apifyResult.caption?.substring(0, 100),
      duration: apifyResult.duration,
      likes: apifyResult.likesCount,
      views: apifyResult.viewsCount,
      audioInfo: apifyResult.audioInfo
    };

    if (apifyResult.isCarousel && apifyResult.carouselItems) {
      console.log(`[APIFY] Instagram carousel with ${apifyResult.carouselItems.length} items`);
      
      const files: Array<{ path: string; type: 'video' | 'image' }> = [];
      
      for (let i = 0; i < Math.min(apifyResult.carouselItems.length, 10); i++) {
        const item = apifyResult.carouselItems[i];
        if (!item.url) continue;
        
        const ext = item.type === 'video' ? 'mp4' : 'jpg';
        const filePath = path.join(this.tempDir, `apify_ig_carousel_${Date.now()}_${i}.${ext}`);
        
        try {
          await this.downloadMediaFile(item.url, filePath);
          if (fs.existsSync(filePath)) {
            files.push({ path: filePath, type: item.type });
          }
        } catch (e: any) {
          console.log(`[APIFY] Failed to download carousel item ${i}:`, e.message);
        }
      }

      if (files.length > 0) {
        return {
          success: true,
          isCarousel: files.length > 1,
          carouselFiles: files.length > 1 ? files : undefined,
          filePath: files.length === 1 ? files[0].path : undefined,
          mediaType: files.length === 1 ? files[0].type : undefined,
          caption,
          metadata: { ...metadata, mediaCount: files.length }
        };
      }
    }

    if (apifyResult.videoUrl) {
      console.log(`[APIFY] Downloading Instagram video from Apify URL...`);
      const filePath = path.join(this.tempDir, `apify_ig_${Date.now()}.mp4`);
      
      try {
        await this.downloadMediaFile(apifyResult.videoUrl, filePath);
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          console.log(`[APIFY] Downloaded Instagram video: ${Math.round(stats.size / 1024)}KB`);
          
          return {
            success: true,
            filePath,
            mediaType: 'video',
            caption,
            metadata
          };
        }
      } catch (e: any) {
        console.log(`[APIFY] Failed to download video:`, e.message);
      }
    }

    if (apifyResult.thumbnailUrl) {
      console.log(`[APIFY] Downloading Instagram thumbnail...`);
      const filePath = path.join(this.tempDir, `apify_ig_${Date.now()}.jpg`);
      
      try {
        await this.downloadMediaFile(apifyResult.thumbnailUrl, filePath);
        
        if (fs.existsSync(filePath)) {
          return {
            success: true,
            filePath,
            mediaType: 'image',
            caption,
            metadata
          };
        }
      } catch (e: any) {
        console.log(`[APIFY] Failed to download thumbnail:`, e.message);
      }
    }

    return { success: false, error: 'No downloadable media from Apify' };
  }

  private async extractViaApifyTikTok(url: string): Promise<{
    success: boolean;
    filePath?: string;
    mediaType?: 'video' | 'image';
    isCarousel?: boolean;
    carouselFiles?: Array<{ path: string; type: 'video' | 'image' }>;
    caption?: string;
    metadata?: any;
    error?: string;
  }> {
    const apifyResult = await apifyService.extractTikTokVideo(url);
    
    if (!apifyResult.success) {
      return { success: false, error: apifyResult.error };
    }

    const caption = apifyResult.caption;
    const metadata = {
      author: apifyResult.author?.username || apifyResult.author?.nickname,
      title: apifyResult.caption?.substring(0, 100),
      duration: apifyResult.duration,
      likes: apifyResult.likesCount,
      views: apifyResult.viewsCount,
      shares: apifyResult.sharesCount,
      music: apifyResult.music
    };

    if (apifyResult.isSlideshow && apifyResult.slideshowImages) {
      console.log(`[APIFY] TikTok slideshow with ${apifyResult.slideshowImages.length} images`);
      
      const files: Array<{ path: string; type: 'video' | 'image' }> = [];
      
      for (let i = 0; i < Math.min(apifyResult.slideshowImages.length, 10); i++) {
        const imageUrl = apifyResult.slideshowImages[i];
        if (!imageUrl) continue;
        
        const filePath = path.join(this.tempDir, `apify_tt_slide_${Date.now()}_${i}.jpg`);
        
        try {
          await this.downloadMediaFile(imageUrl, filePath);
          if (fs.existsSync(filePath)) {
            files.push({ path: filePath, type: 'image' });
          }
        } catch (e: any) {
          console.log(`[APIFY] Failed to download slideshow image ${i}:`, e.message);
        }
      }

      if (files.length > 0) {
        return {
          success: true,
          isCarousel: files.length > 1,
          carouselFiles: files.length > 1 ? files : undefined,
          filePath: files.length === 1 ? files[0].path : undefined,
          mediaType: files.length === 1 ? files[0].type : undefined,
          caption,
          metadata: { ...metadata, mediaCount: files.length }
        };
      }
    }

    if (apifyResult.videoUrl) {
      console.log(`[APIFY] Downloading TikTok video from Apify URL...`);
      const filePath = path.join(this.tempDir, `apify_tt_${Date.now()}.mp4`);
      
      try {
        await this.downloadMediaFile(apifyResult.videoUrl, filePath);
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          console.log(`[APIFY] Downloaded TikTok video: ${Math.round(stats.size / 1024)}KB`);
          
          return {
            success: true,
            filePath,
            mediaType: 'video',
            caption,
            metadata
          };
        }
      } catch (e: any) {
        console.log(`[APIFY] Failed to download TikTok video:`, e.message);
      }
    }

    if (apifyResult.thumbnailUrl) {
      console.log(`[APIFY] Downloading TikTok thumbnail...`);
      const filePath = path.join(this.tempDir, `apify_tt_${Date.now()}.jpg`);
      
      try {
        await this.downloadMediaFile(apifyResult.thumbnailUrl, filePath);
        
        if (fs.existsSync(filePath)) {
          return {
            success: true,
            filePath,
            mediaType: 'image',
            caption,
            metadata
          };
        }
      } catch (e: any) {
        console.log(`[APIFY] Failed to download TikTok thumbnail:`, e.message);
      }
    }

    return { success: false, error: 'No downloadable media from Apify' };
  }

  private extractInstagramId(url: string): string | null {
    const patterns = [
      /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i,
      /instagram\.com\/stories\/[\w.]+\/(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private extractTikTokId(url: string): string | null {
    const patterns = [
      /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
      /tiktok\.com\/t\/([A-Za-z0-9]+)/i,
      /vm\.tiktok\.com\/([A-Za-z0-9]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private async extractDirectFromInstagram(url: string): Promise<{
    success: boolean;
    filePath?: string;
    mediaType?: 'video' | 'image';
    isCarousel?: boolean;
    carouselFiles?: Array<{ path: string; type: 'video' | 'image' }>;
    caption?: string;
    metadata?: any;
    error?: string;
  }> {
    const postId = this.extractInstagramId(url);
    if (!postId) {
      return { success: false, error: 'Could not extract Instagram post ID' };
    }

    console.log(`[INSTAGRAM] Extracting content for post: ${postId}`);

    try {
      const embedResult = await this.fetchInstagramEmbed(postId);
      if (embedResult.success) {
        return embedResult;
      }
      console.log(`[INSTAGRAM] Embed method failed: ${embedResult.error}`);
    } catch (e: any) {
      console.log(`[INSTAGRAM] Embed extraction error:`, e.message);
    }

    try {
      const gqlResult = await this.fetchInstagramGraphQL(postId);
      if (gqlResult.success) {
        return gqlResult;
      }
      console.log(`[INSTAGRAM] GraphQL method failed: ${gqlResult.error}`);
    } catch (e: any) {
      console.log(`[INSTAGRAM] GraphQL extraction error:`, e.message);
    }

    return { 
      success: false, 
      error: 'All Instagram extraction methods failed. Content may be private or age-restricted.' 
    };
  }

  private async fetchInstagramEmbed(postId: string): Promise<{
    success: boolean;
    filePath?: string;
    mediaType?: 'video' | 'image';
    isCarousel?: boolean;
    carouselFiles?: Array<{ path: string; type: 'video' | 'image' }>;
    caption?: string;
    metadata?: any;
    error?: string;
  }> {
    console.log(`[INSTAGRAM] Trying embed page extraction...`);
    
    const embedUrl = `https://www.instagram.com/p/${postId}/embed/captioned/`;
    
    const response = await axios.get(embedUrl, {
      headers: INSTAGRAM_HEADERS,
      timeout: 15000
    });

    const html = response.data;
    
    const jsonMatch = html.match(/"init",\[\],\[(.*?)\]\],/);
    if (!jsonMatch) {
      return { success: false, error: 'Could not find embed data' };
    }

    let embedData;
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed?.contextJSON) {
        embedData = JSON.parse(parsed.contextJSON);
      } else {
        embedData = parsed;
      }
    } catch (e) {
      return { success: false, error: 'Could not parse embed JSON' };
    }

    if (!embedData) {
      return { success: false, error: 'Empty embed data' };
    }

    const caption = embedData.caption?.text || embedData.title;
    
    if (embedData.video_url) {
      console.log(`[INSTAGRAM] Found video URL in embed`);
      return await this.downloadAndReturnMedia(embedData.video_url, 'video', caption, {
        author: embedData.owner?.username
      });
    }
    
    if (embedData.display_url) {
      console.log(`[INSTAGRAM] Found image URL in embed`);
      return await this.downloadAndReturnMedia(embedData.display_url, 'image', caption, {
        author: embedData.owner?.username
      });
    }

    return { success: false, error: 'No media URLs in embed data' };
  }

  private async fetchInstagramGraphQL(postId: string): Promise<{
    success: boolean;
    filePath?: string;
    mediaType?: 'video' | 'image';
    isCarousel?: boolean;
    carouselFiles?: Array<{ path: string; type: 'video' | 'image' }>;
    caption?: string;
    metadata?: any;
    error?: string;
  }> {
    console.log(`[INSTAGRAM] Trying GraphQL extraction...`);
    
    const pageUrl = `https://www.instagram.com/p/${postId}/`;
    const pageResponse = await axios.get(pageUrl, {
      headers: INSTAGRAM_HEADERS,
      timeout: 15000
    });

    const pageHtml = pageResponse.data;
    
    const scriptMatch = pageHtml.match(/<script[^>]*>window\._sharedData\s*=\s*(\{[\s\S]*?\});<\/script>/);
    let sharedData = null;
    
    if (scriptMatch) {
      try {
        sharedData = JSON.parse(scriptMatch[1]);
      } catch (e) {
        console.log(`[INSTAGRAM] Could not parse _sharedData`);
      }
    }

    const additionalMatch = pageHtml.match(/<script[^>]*>window\.__additionalDataLoaded\s*\([^,]+,\s*(\{[\s\S]*?\})\s*\);<\/script>/);
    let additionalData = null;
    
    if (additionalMatch) {
      try {
        additionalData = JSON.parse(additionalMatch[1]);
      } catch (e) {
        console.log(`[INSTAGRAM] Could not parse additionalData`);
      }
    }

    const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media ||
                  additionalData?.graphql?.shortcode_media ||
                  additionalData?.items?.[0];

    if (!media) {
      const lsd = pageHtml.match(/"LSD",\[\],\{"token":"([^"]+)"\}/)?.[1] || 
                  Math.random().toString(36).substring(2, 10);
      const csrf = pageHtml.match(/"csrf_token":"([^"]+)"/)?.[1];
      
      console.log(`[INSTAGRAM] Trying direct GraphQL query...`);
      
      try {
        const gqlResponse = await axios.post('https://www.instagram.com/graphql/query', 
          new URLSearchParams({
            fb_api_caller_class: 'RelayModern',
            fb_api_req_friendly_name: 'PolarisPostActionLoadPostQueryQuery',
            variables: JSON.stringify({
              shortcode: postId,
              fetch_tagged_user_count: null,
              hoisted_comment_id: null,
              hoisted_reply_id: null
            }),
            server_timestamps: 'true',
            doc_id: '8845758582119845'
          }).toString(),
          {
            headers: {
              ...INSTAGRAM_HEADERS,
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-FB-LSD': lsd,
              'X-CSRFToken': csrf || '',
              'X-IG-App-ID': IG_APP_ID,
              'X-FB-Friendly-Name': 'PolarisPostActionLoadPostQueryQuery'
            },
            timeout: 15000
          }
        );

        const gqlData = gqlResponse.data?.data?.xdt_shortcode_media || 
                       gqlResponse.data?.data?.shortcode_media;
        
        if (gqlData) {
          return this.processInstagramMedia(gqlData);
        }
      } catch (e: any) {
        console.log(`[INSTAGRAM] GraphQL query failed:`, e.message);
      }
      
      return { success: false, error: 'Could not find media in page data' };
    }

    return this.processInstagramMedia(media);
  }

  private async processInstagramMedia(media: any): Promise<{
    success: boolean;
    filePath?: string;
    mediaType?: 'video' | 'image';
    isCarousel?: boolean;
    carouselFiles?: Array<{ path: string; type: 'video' | 'image' }>;
    caption?: string;
    metadata?: any;
    error?: string;
  }> {
    const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text || 
                   media.caption?.text;
    const author = media.owner?.username;

    const sidecar = media.edge_sidecar_to_children?.edges || media.carousel_media;
    if (sidecar && sidecar.length > 0) {
      console.log(`[INSTAGRAM] Found carousel with ${sidecar.length} items`);
      
      const files: Array<{ path: string; type: 'video' | 'image' }> = [];
      
      for (let i = 0; i < Math.min(sidecar.length, 10); i++) {
        const item = sidecar[i]?.node || sidecar[i];
        const isVideo = item.is_video || item.video_versions;
        const mediaUrl = isVideo ? 
          (item.video_url || item.video_versions?.[0]?.url) : 
          (item.display_url || item.image_versions2?.candidates?.[0]?.url);
        
        if (mediaUrl) {
          const ext = isVideo ? 'mp4' : 'jpg';
          const filePath = path.join(this.tempDir, `ig_carousel_${Date.now()}_${i}.${ext}`);
          
          try {
            await this.downloadMediaFile(mediaUrl, filePath);
            if (fs.existsSync(filePath)) {
              files.push({ path: filePath, type: isVideo ? 'video' : 'image' });
            }
          } catch (e: any) {
            console.log(`[INSTAGRAM] Failed to download carousel item ${i}:`, e.message);
          }
        }
      }

      if (files.length > 0) {
        return {
          success: true,
          isCarousel: files.length > 1,
          carouselFiles: files.length > 1 ? files : undefined,
          filePath: files.length === 1 ? files[0].path : undefined,
          mediaType: files.length === 1 ? files[0].type : undefined,
          caption,
          metadata: { author, mediaCount: files.length }
        };
      }
    }

    const isVideo = media.is_video || media.video_versions;
    const mediaUrl = isVideo ? 
      (media.video_url || media.video_versions?.[0]?.url) : 
      (media.display_url || media.image_versions2?.candidates?.[0]?.url);

    if (!mediaUrl) {
      return { success: false, error: 'No media URL found' };
    }

    return await this.downloadAndReturnMedia(mediaUrl, isVideo ? 'video' : 'image', caption, { author });
  }

  private async extractDirectFromTikTok(url: string): Promise<{
    success: boolean;
    filePath?: string;
    mediaType?: 'video' | 'image';
    isCarousel?: boolean;
    carouselFiles?: Array<{ path: string; type: 'video' | 'image' }>;
    caption?: string;
    metadata?: any;
    error?: string;
  }> {
    let postId = this.extractTikTokId(url);
    let resolvedUrl = url;
    
    console.log(`[TIKTOK] Resolving URL: ${url}`);
    try {
      const resolved = await axios.get(url, {
        headers: { 'User-Agent': TIKTOK_HEADERS['User-Agent'] },
        maxRedirects: 10,
        timeout: 15000,
        validateStatus: () => true
      });
      
      const finalUrl = resolved.request?.res?.responseUrl || resolved.config?.url || url;
      resolvedUrl = finalUrl;
      console.log(`[TIKTOK] Resolved to: ${finalUrl}`);
      
      const match = finalUrl.match(/video\/(\d+)/);
      if (match) postId = match[1];
    } catch (e: any) {
      console.log(`[TIKTOK] URL resolution failed:`, e.message);
    }

    if (!postId) {
      return { success: false, error: 'Could not extract TikTok video ID' };
    }

    console.log(`[TIKTOK] Extracting content for video: ${postId}`);

    try {
      const response = await axios.get(resolvedUrl, {
        headers: TIKTOK_HEADERS,
        timeout: 15000
      });

      const html = response.data;
      
      const scriptMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
      if (!scriptMatch) {
        return { success: false, error: 'Could not find TikTok data script' };
      }

      let data;
      try {
        data = JSON.parse(scriptMatch[1]);
      } catch (e) {
        return { success: false, error: 'Could not parse TikTok data' };
      }

      const videoDetail = data?.['__DEFAULT_SCOPE__']?.['webapp.video-detail'];
      
      if (!videoDetail) {
        return { success: false, error: 'No video detail found in TikTok data' };
      }

      if (videoDetail.statusMsg) {
        return { success: false, error: `TikTok error: ${videoDetail.statusMsg}` };
      }

      const detail = videoDetail?.itemInfo?.itemStruct;
      if (!detail) {
        return { success: false, error: 'No item structure in TikTok response' };
      }

      if (detail.isContentClassified) {
        return { success: false, error: 'Content is age-restricted' };
      }

      const author = detail.author?.uniqueId || detail.author?.nickname;
      const caption = detail.desc;
      
      const images = detail.imagePost?.images;
      if (images && images.length > 0) {
        console.log(`[TIKTOK] Found photo slideshow with ${images.length} images`);
        
        const files: Array<{ path: string; type: 'video' | 'image' }> = [];
        
        for (let i = 0; i < Math.min(images.length, 10); i++) {
          const imageUrl = images[i]?.imageURL?.urlList?.find((u: string) => u.includes('.jpeg')) ||
                          images[i]?.imageURL?.urlList?.[0];
          
          if (imageUrl) {
            const filePath = path.join(this.tempDir, `tt_slide_${Date.now()}_${i}.jpg`);
            try {
              await this.downloadMediaFile(imageUrl, filePath);
              if (fs.existsSync(filePath)) {
                files.push({ path: filePath, type: 'image' });
              }
            } catch (e: any) {
              console.log(`[TIKTOK] Failed to download slide ${i}:`, e.message);
            }
          }
        }

        if (files.length > 0) {
          return {
            success: true,
            isCarousel: files.length > 1,
            carouselFiles: files.length > 1 ? files : undefined,
            filePath: files.length === 1 ? files[0].path : undefined,
            mediaType: files.length === 1 ? files[0].type : undefined,
            caption,
            metadata: { author, mediaCount: files.length }
          };
        }
      }

      const playAddr = detail.video?.playAddr || 
                      detail.video?.downloadAddr ||
                      detail.video?.bitrateInfo?.[0]?.PlayAddr?.UrlList?.[0];

      if (!playAddr) {
        return { success: false, error: 'No video URL found' };
      }

      console.log(`[TIKTOK] Found video URL`);
      return await this.downloadAndReturnMedia(playAddr, 'video', caption, { 
        author,
        duration: detail.video?.duration
      });

    } catch (error: any) {
      console.error(`[TIKTOK] Extraction error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  private async downloadAndReturnMedia(
    mediaUrl: string, 
    mediaType: 'video' | 'image',
    caption?: string,
    metadata?: any
  ): Promise<{
    success: boolean;
    filePath?: string;
    mediaType?: 'video' | 'image';
    caption?: string;
    metadata?: any;
    error?: string;
  }> {
    const ext = mediaType === 'video' ? 'mp4' : 'jpg';
    const filePath = path.join(this.tempDir, `direct_${Date.now()}.${ext}`);
    
    try {
      await this.downloadMediaFile(mediaUrl, filePath);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`[DIRECT] Downloaded ${mediaType}: ${Math.round(stats.size / 1024)}KB`);
        
        return {
          success: true,
          filePath,
          mediaType,
          caption,
          metadata
        };
      }
      
      return { success: false, error: 'Downloaded file not found' };
    } catch (error: any) {
      return { success: false, error: `Download failed: ${error.message}` };
    }
  }

  private async downloadMediaFile(url: string, filePath: string): Promise<void> {
    console.log(`[DIRECT] Downloading media file...`);
    
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.instagram.com/'
      },
      maxRedirects: 5
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  private async downloadMedia(url: string, platform: string): Promise<{
    success: boolean;
    filePath?: string;
    mediaType?: 'video' | 'image';
    isCarousel?: boolean;
    carouselFiles?: Array<{ path: string; type: 'video' | 'image' }>;
    caption?: string;
    metadata?: any;
    error?: string;
  }> {
    console.log(`[SOCIAL_MEDIA] Downloading media using yt-dlp...`);
    
    try {
      const outputTemplate = path.join(this.tempDir, `media_${Date.now()}.%(ext)s`);
      const infoPath = path.join(this.tempDir, `info_${Date.now()}.json`);
      
      const infoResult = await execAsync(
        `yt-dlp --dump-json --no-download "${url}"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
      ).catch(() => null);

      let info: YtDlpInfo | null = null;
      let caption: string | undefined;
      
      if (infoResult?.stdout) {
        try {
          info = JSON.parse(infoResult.stdout) as YtDlpInfo;
          caption = info.description;
        } catch (e) {
          console.log(`[SOCIAL_MEDIA] Could not parse video info`);
        }
      }

      if (info?.entries && info.entries.length > 1) {
        console.log(`[SOCIAL_MEDIA] Detected carousel with ${info.entries.length} items`);
        
        const files: Array<{ path: string; type: 'video' | 'image' }> = [];
        
        for (let i = 0; i < Math.min(info.entries.length, 10); i++) {
          const entry = info.entries[i];
          const isImage = entry.ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(entry.ext.toLowerCase());
          const timestamp = Date.now();
          
          if (isImage && entry.url) {
            const imagePath = path.join(this.tempDir, `carousel_${timestamp}_${i}.jpg`);
            try {
              await this.downloadFile(entry.url, imagePath);
              if (fs.existsSync(imagePath)) {
                files.push({ path: imagePath, type: 'image' });
              }
            } catch (e: any) {
              console.log(`[SOCIAL_MEDIA] Could not download carousel image ${i}:`, e.message);
            }
          } else {
            const itemPath = path.join(this.tempDir, `carousel_${timestamp}_${i}.mp4`);
            
            try {
              await execAsync(
                `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]/bestvideo+bestaudio/best" --playlist-items ${i + 1} -o "${itemPath}" "${url}"`,
                { timeout: 120000 }
              );
              
              if (fs.existsSync(itemPath)) {
                files.push({ path: itemPath, type: 'video' });
              } else {
                const webmPath = itemPath.replace('.mp4', '.webm');
                if (fs.existsSync(webmPath)) {
                  files.push({ path: webmPath, type: 'video' });
                }
              }
            } catch (e: any) {
              console.log(`[SOCIAL_MEDIA] Could not download carousel video ${i}:`, e.message);
            }
          }
        }

        if (files.length > 0) {
          return {
            success: true,
            isCarousel: true,
            carouselFiles: files,
            caption,
            metadata: {
              title: info?.title,
              author: info?.uploader,
              duration: info?.duration,
              mediaCount: info.entries.length
            }
          };
        }
      }

      const filePath = path.join(this.tempDir, `media_${Date.now()}.mp4`);
      
      await execAsync(
        `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]/bestvideo+bestaudio/best" --merge-output-format mp4 -o "${filePath}" "${url}"`,
        { timeout: 120000 }
      );

      if (!fs.existsSync(filePath)) {
        const possibleFiles = fs.readdirSync(this.tempDir)
          .filter(f => f.startsWith(`media_`) && (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.jpg')))
          .sort()
          .reverse();
        
        if (possibleFiles.length > 0) {
          const actualPath = path.join(this.tempDir, possibleFiles[0]);
          const isVideo = !possibleFiles[0].endsWith('.jpg');
          
          return {
            success: true,
            filePath: actualPath,
            mediaType: isVideo ? 'video' : 'image',
            caption,
            metadata: {
              title: info?.title,
              author: info?.uploader,
              duration: info?.duration
            }
          };
        }
        
        return {
          success: false,
          error: 'Download completed but file not found'
        };
      }

      return {
        success: true,
        filePath,
        mediaType: 'video',
        caption,
        metadata: {
          title: info?.title,
          author: info?.uploader,
          duration: info?.duration
        }
      };

    } catch (error: any) {
      console.error(`[SOCIAL_MEDIA] yt-dlp download failed:`, error.message);
      
      return {
        success: false,
        error: `Failed to download: ${error.message}. The content might be private, age-restricted, or require login.`
      };
    }
  }

  private async downloadFile(url: string, filePath: string): Promise<void> {
    console.log(`[SOCIAL_MEDIA] Downloading file to: ${filePath}`);
    
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  private async processMediaFile(filePath: string, mediaType: 'video' | 'image'): Promise<{
    transcript?: string;
    ocrText?: string;
  }> {
    const result: { transcript?: string; ocrText?: string } = {};

    if (mediaType === 'video') {
      const [transcript, ocrText] = await Promise.all([
        this.transcribeAudio(filePath),
        this.extractVideoFramesAndOCR(filePath)
      ]);
      result.transcript = transcript;
      result.ocrText = ocrText;
    } else if (mediaType === 'image') {
      result.ocrText = await this.performOCR(filePath);
    }

    return result;
  }

  private async transcribeAudio(videoPath: string): Promise<string | undefined> {
    const audioPath = videoPath.replace(/\.\w+$/, '.mp3');
    
    try {
      console.log(`[SOCIAL_MEDIA] Extracting audio from video...`);
      await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 4 -y "${audioPath}"`, {
        timeout: 60000
      });

      if (!fs.existsSync(audioPath)) {
        console.log(`[SOCIAL_MEDIA] No audio track found in video`);
        return undefined;
      }

      const stats = fs.statSync(audioPath);
      if (stats.size < 1000) {
        console.log(`[SOCIAL_MEDIA] Audio file too small, likely silent`);
        return undefined;
      }

      if (stats.size > 25 * 1024 * 1024) {
        console.log(`[SOCIAL_MEDIA] Audio too large for Whisper (${Math.round(stats.size / 1024 / 1024)}MB), skipping transcription`);
        return undefined;
      }

      console.log(`[SOCIAL_MEDIA] Transcribing audio (${Math.round(stats.size / 1024)}KB)...`);
      
      const fileName = path.basename(audioPath);
      const file = await OpenAI.toFile(fs.createReadStream(audioPath), fileName);
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'text'
      });
      
      const transcript = String(transcription).trim();
      console.log(`[SOCIAL_MEDIA] Transcription complete: ${transcript.length} chars`);
      
      if (!transcript) {
        return undefined;
      }
      
      const musicAnalysis = this.detectMusicVsNarration(transcript);
      
      if (musicAnalysis.isLikelyMusic) {
        console.log(`[SOCIAL_MEDIA] Detected background music (confidence: ${(musicAnalysis.confidence * 100).toFixed(0)}%), marking as such`);
        return `[Background Music - Not Narration]\n${transcript}`;
      }
      
      return transcript;

    } catch (error: any) {
      console.error(`[SOCIAL_MEDIA] Transcription error:`, error.message);
      return undefined;
    } finally {
      this.cleanupFile(audioPath);
    }
  }

  private detectMusicVsNarration(transcript: string): { isLikelyMusic: boolean; confidence: number } {
    const text = transcript.toLowerCase();
    const words = text.split(/\s+/);
    
    let musicScore = 0;
    let narrationScore = 0;
    
    const musicPatterns = [
      /\b(la la|na na|oh oh|yeah yeah|hey hey|baby|love|heart|dance|party|night|girl|boy|sexy|body|feel|groove)\b/gi,
      /\b(ooh|ahh|mmm|uh|huh|whoa|yo|yow|ayy)\b/gi,
      /\b(step in|pull up|rock with|vibe with|hit the|on the floor)\b/gi,
      /\b(baddie|baller|flexin|drippin|slay|fire|lit|vibes)\b/gi
    ];
    
    const narrationPatterns = [
      /\b(today|first|second|third|step|tip|here's|let me|i'm going|welcome|hello|hi everyone)\b/gi,
      /\b(you should|you can|try this|recommend|suggest|best way|how to)\b/gi,
      /\b(location|address|price|cost|budget|book|reserve|call)\b/gi,
      /\b(number one|number two|activity|experience|place|venue)\b/gi
    ];
    
    for (const pattern of musicPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        musicScore += matches.length * 2;
      }
    }
    
    for (const pattern of narrationPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        narrationScore += matches.length * 3;
      }
    }
    
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    
    if (avgWordsPerSentence > 15) {
      musicScore += 3;
    }
    
    const repetitionCount = this.countRepetitions(words);
    if (repetitionCount > words.length * 0.15) {
      musicScore += 4;
    }
    
    const rhymeScore = this.detectRhymePatterns(transcript);
    musicScore += rhymeScore;
    
    if (text.includes('step') && text.includes('party') && text.includes('body')) {
      musicScore += 5;
    }
    
    const totalScore = musicScore + narrationScore;
    const confidence = totalScore > 0 ? musicScore / totalScore : 0.5;
    
    const isLikelyMusic = musicScore > narrationScore && musicScore >= 5;
    
    return { isLikelyMusic, confidence };
  }

  private countRepetitions(words: string[]): number {
    const wordCounts: Record<string, number> = {};
    for (const word of words) {
      if (word.length > 2) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
    
    let repetitions = 0;
    for (const count of Object.values(wordCounts)) {
      if (count > 2) {
        repetitions += count - 1;
      }
    }
    
    return repetitions;
  }

  private detectRhymePatterns(text: string): number {
    const lines = text.split(/[,\n]/).filter(l => l.trim().length > 0);
    let rhymeScore = 0;
    
    for (let i = 0; i < lines.length - 1; i++) {
      const words1 = lines[i].trim().split(/\s+/);
      const words2 = lines[i + 1].trim().split(/\s+/);
      
      if (words1.length > 0 && words2.length > 0) {
        const end1 = words1[words1.length - 1].toLowerCase().slice(-3);
        const end2 = words2[words2.length - 1].toLowerCase().slice(-3);
        
        if (end1 === end2 && end1.length >= 2) {
          rhymeScore += 1;
        }
      }
    }
    
    return rhymeScore;
  }

  private async getVideoDuration(videoPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
        { timeout: 10000 }
      );
      const duration = parseFloat(stdout.trim());
      return isNaN(duration) ? 30 : duration;
    } catch (error) {
      console.log(`[SOCIAL_MEDIA] Could not get video duration, defaulting to 30s`);
      return 30;
    }
  }

  private async extractVideoFramesAndOCR(videoPath: string): Promise<string | undefined> {
    const framesDir = path.join(this.tempDir, `frames_${Date.now()}`);
    
    try {
      fs.mkdirSync(framesDir, { recursive: true });

      const duration = await this.getVideoDuration(videoPath);
      console.log(`[SOCIAL_MEDIA] Video duration: ${duration.toFixed(1)}s`);
      
      const targetFrameCount = Math.min(20, Math.max(10, Math.ceil(duration / 3)));
      const interval = duration / (targetFrameCount + 1);
      
      const timestamps: number[] = [];
      for (let i = 1; i <= targetFrameCount; i++) {
        timestamps.push(interval * i);
      }
      
      console.log(`[SOCIAL_MEDIA] Extracting ${timestamps.length} frames evenly distributed across ${duration.toFixed(1)}s video...`);
      
      const extractionPromises = timestamps.map(async (ts, index) => {
        const framePath = path.join(framesDir, `frame_${String(index).padStart(3, '0')}.jpg`);
        try {
          await execAsync(
            `ffmpeg -ss ${ts.toFixed(2)} -i "${videoPath}" -vframes 1 -q:v 2 -vf "scale=1280:-1" "${framePath}"`,
            { timeout: 15000 }
          );
          return framePath;
        } catch (error) {
          return null;
        }
      });
      
      await Promise.all(extractionPromises);

      const frameFiles = fs.readdirSync(framesDir)
        .filter(f => f.endsWith('.jpg'))
        .sort();

      if (frameFiles.length === 0) {
        console.log(`[SOCIAL_MEDIA] No frames extracted`);
        fs.rmSync(framesDir, { recursive: true, force: true });
        return undefined;
      }

      console.log(`[SOCIAL_MEDIA] Running OCR on ${frameFiles.length} frames...`);
      
      const ocrPromises = frameFiles.map(async (frameFile) => {
        const framePath = path.join(framesDir, frameFile);
        const ocrText = await this.performOCR(framePath);
        return ocrText && ocrText.trim().length > 5 ? ocrText.trim() : null;
      });
      
      const ocrResultsRaw = await Promise.all(ocrPromises);
      const ocrResults = ocrResultsRaw.filter((text): text is string => text !== null);

      fs.rmSync(framesDir, { recursive: true, force: true });

      if (ocrResults.length === 0) {
        return undefined;
      }

      const uniqueTexts = this.deduplicateOCRResults(ocrResults);
      const combinedText = uniqueTexts.join('\n---\n');
      console.log(`[SOCIAL_MEDIA] OCR complete: ${combinedText.length} chars from ${uniqueTexts.length} unique frames`);
      
      return combinedText;

    } catch (error: any) {
      console.error(`[SOCIAL_MEDIA] Frame extraction/OCR error:`, error.message);
      try {
        fs.rmSync(framesDir, { recursive: true, force: true });
      } catch (e) {}
      return undefined;
    }
  }

  private deduplicateOCRResults(results: string[]): string[] {
    const unique: string[] = [];
    
    for (const text of results) {
      const normalizedNew = text.toLowerCase().replace(/\s+/g, ' ').trim();
      
      let isDuplicate = false;
      for (const existing of unique) {
        const normalizedExisting = existing.toLowerCase().replace(/\s+/g, ' ').trim();
        
        if (normalizedNew === normalizedExisting) {
          isDuplicate = true;
          break;
        }
        
        const shorter = normalizedNew.length < normalizedExisting.length ? normalizedNew : normalizedExisting;
        const longer = normalizedNew.length >= normalizedExisting.length ? normalizedNew : normalizedExisting;
        
        if (longer.includes(shorter) && shorter.length > 20) {
          if (normalizedNew.length > normalizedExisting.length) {
            const idx = unique.indexOf(existing);
            unique[idx] = text;
          }
          isDuplicate = true;
          break;
        }
        
        const similarity = this.calculateSimilarity(normalizedNew, normalizedExisting);
        if (similarity > 0.85) {
          if (text.length > existing.length) {
            const idx = unique.indexOf(existing);
            unique[idx] = text;
          }
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        unique.push(text);
      }
    }
    
    return unique;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    let intersection = 0;
    for (const word of words1) {
      if (words2.has(word)) {
        intersection++;
      }
    }
    
    const union = words1.size + words2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private async performOCR(imagePath: string): Promise<string | undefined> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ALL visible text from this image. Include titles, captions, overlay text, prices, dates, locations, and any other readable text. Return ONLY the extracted text, nothing else. If there is no text, return "NO_TEXT".'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      const text = response.choices[0]?.message?.content?.trim();
      
      if (!text || text === 'NO_TEXT' || text.toLowerCase().includes('no text')) {
        return undefined;
      }

      return text;

    } catch (error: any) {
      console.error(`[SOCIAL_MEDIA] OCR error:`, error.message);
      return undefined;
    }
  }

  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`[SOCIAL_MEDIA] Cleanup error:`, error);
    }
  }

  combineExtractedContent(result: SocialMediaContent): string {
    const sections: string[] = [];

    sections.push(`Platform: ${result.platform.toUpperCase()}`);
    sections.push(`URL: ${result.url}`);

    if (result.metadata) {
      if (result.metadata.author) {
        sections.push(`Author: ${result.metadata.author}`);
      }
      if (result.metadata.title) {
        sections.push(`Title: ${result.metadata.title}`);
      }
    }

    if (result.caption) {
      sections.push(`\n--- Caption/Description ---\n${result.caption}`);
    }

    if (result.audioTranscript) {
      sections.push(`\n--- Audio Transcript (What was said) ---\n${result.audioTranscript}`);
    }

    if (result.ocrText) {
      sections.push(`\n--- On-Screen Text (OCR) ---\n${result.ocrText}`);
    }

    if (result.carouselItems && result.carouselItems.length > 0) {
      sections.push(`\n--- Carousel/Slides (${result.carouselItems.length} items) ---`);
      
      result.carouselItems.forEach((item, index) => {
        sections.push(`\nSlide ${index + 1} (${item.type}):`);
        if (item.transcript) {
          sections.push(`  Audio: ${item.transcript}`);
        }
        if (item.ocrText) {
          sections.push(`  Text: ${item.ocrText}`);
        }
      });
    }

    return sections.join('\n');
  }
}

export const socialMediaVideoService = new SocialMediaVideoService();
