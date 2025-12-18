import axios from "axios";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE_URL = "https://api.apify.com/v2";

export interface ApifyInstagramResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  likesCount?: number;
  viewsCount?: number;
  commentsCount?: number;
  duration?: number;
  author?: {
    username?: string;
    fullName?: string;
  };
  audioInfo?: {
    artist?: string;
    songName?: string;
    isOriginal?: boolean;
  };
  isCarousel?: boolean;
  carouselItems?: Array<{
    type: "video" | "image";
    url: string;
  }>;
  error?: string;
}

export interface ApifyTikTokResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  hashtags?: string[];
  likesCount?: number;
  viewsCount?: number;
  sharesCount?: number;
  commentsCount?: number;
  duration?: number;
  author?: {
    username?: string;
    nickname?: string;
  };
  music?: {
    title?: string;
    author?: string;
  };
  isSlideshow?: boolean;
  slideshowImages?: string[];
  error?: string;
}

class ApifyService {
  private isConfigured(): boolean {
    return !!APIFY_API_TOKEN;
  }

  async extractInstagramReel(url: string): Promise<ApifyInstagramResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "Apify API token not configured" };
    }

    console.log(`[APIFY] Extracting Instagram Reel: ${url}`);

    // Use the general Instagram scraper (apify/instagram-scraper) as primary
    // This is free and supports direct post/reel URLs
    try {
      const actorId = "apify~instagram-scraper";
      const runUrl = `${APIFY_BASE_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

      console.log(`[APIFY] Using apify/instagram-scraper actor...`);
      const response = await axios.post(
        runUrl,
        {
          directUrls: [url],
          resultsType: "posts",
          resultsLimit: 1,
          addParentData: false,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 90000,
        },
      );

      const items = response.data;

      if (!items || items.length === 0) {
        console.log(
          `[APIFY] instagram-scraper returned no results, trying reel-scraper...`,
        );
        return await this.extractInstagramReelAlternative(url);
      }

      const item = items[0];

      // Log full response structure to debug field mapping
      console.log(`[APIFY] Raw Instagram data keys:`, Object.keys(item));
      console.log(`[APIFY] Instagram extraction successful:`, {
        hasVideo: !!item.videoUrl || !!item.video_url || !!item.video,
        caption: (item.caption || item.text)?.substring(0, 100),
        likes: item.likesCount || item.likes || item.like_count,
        views:
          item.videoViewCount ||
          item.viewCount ||
          item.views ||
          item.play_count,
        duration: item.duration || item.video_duration,
      });

      if (item.carousel_media && item.carousel_media.length > 0) {
        const carouselItems = item.carousel_media
          .map((media: any) => ({
            type: media.video_url ? "video" : "image",
            url:
              media.video_url ||
              media.display_url ||
              media.image_versions2?.candidates?.[0]?.url,
          }))
          .filter((m: any) => m.url);

        return {
          success: true,
          isCarousel: true,
          carouselItems,
          caption: item.caption,
          hashtags: item.hashtags,
          mentions: item.mentions,
          likesCount: item.likesCount,
          viewsCount: item.viewsCount || item.playsCount,
          commentsCount: item.commentsCount,
          author: {
            username: item.ownerUsername,
            fullName: item.ownerFullName,
          },
          audioInfo: item.audioInfo,
        };
      }

      return {
        success: true,
        videoUrl: item.videoUrl,
        thumbnailUrl: item.thumbnailUrl,
        caption: item.caption,
        hashtags: item.hashtags,
        mentions: item.mentions,
        likesCount: item.likesCount,
        viewsCount: item.viewsCount || item.playsCount,
        commentsCount: item.commentsCount,
        duration: item.duration,
        author: {
          username: item.ownerUsername,
          fullName: item.ownerFullName,
        },
        audioInfo: item.audioInfo,
      };
    } catch (error: any) {
      console.error(`[APIFY] Instagram extraction failed:`, error.message);
      
      // Log full error details for debugging
      console.error(`[APIFY] Full error details:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });

      if (error.response?.status === 402) {
        return {
          success: false,
          error: "Apify credits exhausted. Please add more credits.",
        };
      }
      if (error.response?.status === 401) {
        return { success: false, error: "Invalid Apify API token" };
      }
      if (error.response?.status === 400) {
        console.error(`[APIFY] 400 Bad Request - Actor may be deprecated or input format changed:`, error.response?.data);
      }

      // Try official instagram-reel-scraper with updated input format
      console.log(`[APIFY] Trying official instagram-reel-scraper actor...`);
      return await this.extractInstagramReelOfficial(url);
    }
  }

  private async extractInstagramReelAlternative(
    url: string,
  ): Promise<ApifyInstagramResult> {
    try {
      // Fallback to general Instagram scraper
      const actorId = "apify~instagram-scraper";
      const runUrl = `${APIFY_BASE_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

      console.log(`[APIFY] Using instagram-scraper actor as fallback...`);
      const response = await axios.post(
        runUrl,
        {
          directUrls: [url],
          resultsType: "posts",
          resultsLimit: 1,
          addParentData: false,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 90000,
        },
      );

      const items = response.data;

      if (!items || items.length === 0) {
        return { success: false, error: "No content found from Apify" };
      }

      const item = items[0];

      return {
        success: true,
        videoUrl: item.videoUrl,
        thumbnailUrl: item.thumbnailUrl,
        caption: item.caption,
        hashtags: item.hashtags,
        mentions: item.mentions,
        likesCount: item.likesCount,
        viewsCount: item.viewsCount || item.playsCount,
        commentsCount: item.commentsCount,
        duration: item.duration,
        author: {
          username: item.ownerUsername,
          fullName: item.ownerFullName,
        },
        audioInfo: item.audioInfo,
      };
    } catch (error: any) {
      console.error(
        `[APIFY] Alternative Instagram extraction also failed:`,
        error.message,
      );
      // Log full error details for debugging
      console.error(`[APIFY] Alternative actor full error:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      return { success: false, error: error.message };
    }
  }

  private async extractInstagramReelOfficial(
    url: string,
  ): Promise<ApifyInstagramResult> {
    try {
      // Try official instagram-reel-scraper with directUrls input
      const actorId = "apify~instagram-reel-scraper";
      const runUrl = `${APIFY_BASE_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

      console.log(`[APIFY] Using official instagram-reel-scraper with directUrls...`);
      const response = await axios.post(
        runUrl,
        {
          directUrls: [url],
          resultsLimit: 1,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 90000,
        },
      );

      const items = response.data;

      if (!items || items.length === 0) {
        console.log(`[APIFY] Official scraper returned no results, trying general scraper...`);
        return await this.extractInstagramReelAlternative(url);
      }

      const item = items[0];
      console.log(`[APIFY] Official scraper successful:`, {
        hasVideo: !!item.videoUrl,
        caption: item.caption?.substring(0, 50),
      });

      return {
        success: true,
        videoUrl: item.videoUrl,
        thumbnailUrl: item.thumbnailUrl || item.displayUrl,
        caption: item.caption,
        hashtags: item.hashtags,
        mentions: item.mentions,
        likesCount: item.likesCount,
        viewsCount: item.videoViewCount || item.viewsCount || item.playsCount,
        commentsCount: item.commentsCount,
        duration: item.videoDuration || item.duration,
        author: {
          username: item.ownerUsername,
          fullName: item.ownerFullName,
        },
        audioInfo: item.audioInfo,
      };
    } catch (error: any) {
      console.error(`[APIFY] Official instagram-reel-scraper also failed:`, error.message);
      console.error(`[APIFY] Error details:`, {
        status: error.response?.status,
        data: error.response?.data,
      });
      // Final fallback to general instagram-scraper
      return await this.extractInstagramReelAlternative(url);
    }
  }

  async extractTikTokVideo(url: string): Promise<ApifyTikTokResult> {
    if (!this.isConfigured()) {
      return { success: false, error: "Apify API token not configured" };
    }

    console.log(`[APIFY] Extracting TikTok video: ${url}`);

    try {
      const actorId = "clockworks~tiktok-scraper";
      const runUrl = `${APIFY_BASE_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

      const response = await axios.post(
        runUrl,
        {
          postURLs: [url],
          resultsPerPage: 1,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
          shouldDownloadSubtitles: false,
          shouldDownloadSlideshowImages: false,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 60000,
        },
      );

      const items = response.data;

      if (!items || items.length === 0) {
        console.log(
          `[APIFY] No results returned for TikTok, trying alternative actor...`,
        );
        return await this.extractTikTokVideoAlternative(url);
      }

      const item = items[0];
      console.log(`[APIFY] TikTok extraction successful:`, {
        hasVideo: !!item.videoUrl || !!item.webVideoUrl,
        caption: item.text?.substring(0, 50),
        likes: item.diggCount,
        views: item.playCount,
      });

      const videoUrl =
        item.videoUrl || item.webVideoUrl || item.videoMeta?.downloadAddr;

      if (item.imagePost && item.imagePost.images?.length > 0) {
        return {
          success: true,
          isSlideshow: true,
          slideshowImages: item.imagePost.images
            .map((img: any) => img.imageURL?.urlList?.[0] || img.url)
            .filter(Boolean),
          caption: item.text,
          hashtags: item.hashtags?.map((h: any) => h.name || h) || [],
          likesCount: item.diggCount,
          viewsCount: item.playCount,
          sharesCount: item.shareCount,
          commentsCount: item.commentCount,
          author: {
            username: item.authorMeta?.name,
            nickname: item.authorMeta?.nickName,
          },
          music: item.musicMeta
            ? {
                title: item.musicMeta.musicName,
                author: item.musicMeta.musicAuthor,
              }
            : undefined,
        };
      }

      return {
        success: true,
        videoUrl,
        thumbnailUrl: item.covers?.default || item.videoMeta?.coverUrl,
        caption: item.text,
        hashtags: item.hashtags?.map((h: any) => h.name || h) || [],
        likesCount: item.diggCount,
        viewsCount: item.playCount,
        sharesCount: item.shareCount,
        commentsCount: item.commentCount,
        duration: item.videoMeta?.duration,
        author: {
          username: item.authorMeta?.name,
          nickname: item.authorMeta?.nickName,
        },
        music: item.musicMeta
          ? {
              title: item.musicMeta.musicName,
              author: item.musicMeta.musicAuthor,
            }
          : undefined,
      };
    } catch (error: any) {
      console.error(`[APIFY] TikTok extraction failed:`, error.message);
      return await this.extractTikTokVideoAlternative(url);
    }
  }

  private async extractTikTokVideoAlternative(
    url: string,
  ): Promise<ApifyTikTokResult> {
    console.log(`[APIFY] Trying alternative TikTok actor...`);

    try {
      const actorId = "novi~fast-tiktok-api";
      const runUrl = `${APIFY_BASE_URL}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

      const response = await axios.post(
        runUrl,
        {
          urls: [url],
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 60000,
        },
      );

      const items = response.data;

      if (!items || items.length === 0) {
        return { success: false, error: "No content found from TikTok" };
      }

      const item = items[0];

      return {
        success: true,
        videoUrl: item.video?.playAddr || item.playurl,
        thumbnailUrl: item.video?.cover || item.thumbnail,
        caption: item.desc || item.title,
        likesCount: item.stats?.diggCount || item.likes,
        viewsCount: item.stats?.playCount || item.views,
        sharesCount: item.stats?.shareCount || item.shares,
        commentsCount: item.stats?.commentCount || item.comments,
        duration: item.video?.duration,
        author: {
          username: item.author?.uniqueId,
          nickname: item.author?.nickname,
        },
        music: item.music
          ? {
              title: item.music.title,
              author: item.music.authorName,
            }
          : undefined,
      };
    } catch (error: any) {
      console.error(
        `[APIFY] Alternative TikTok extraction failed:`,
        error.message,
      );

      if (error.response?.status === 402) {
        return {
          success: false,
          error: "Apify credits exhausted. Please add more credits.",
        };
      }
      if (error.response?.status === 401) {
        return { success: false, error: "Invalid Apify API token" };
      }

      return { success: false, error: error.message };
    }
  }

  isAvailable(): boolean {
    return this.isConfigured();
  }

  getStatus(): { configured: boolean; message: string } {
    if (this.isConfigured()) {
      return { configured: true, message: "Apify integration ready" };
    }
    return { configured: false, message: "APIFY_API_TOKEN not set" };
  }
}

export const apifyService = new ApifyService();

// Log Apify status on startup
const apifyStatus = apifyService.getStatus();
console.log(`[APIFY] Startup check:`, {
  available: apifyService.isAvailable(),
  tokenConfigured: apifyStatus.configured,
  tokenLength: process.env.APIFY_API_TOKEN?.length || 0,
  tokenPrefix: process.env.APIFY_API_TOKEN?.substring(0, 8) || 'not-set',
  message: apifyStatus.message
});
