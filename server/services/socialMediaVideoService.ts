import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      const downloadResult = await this.downloadMedia(url, platform);
      
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
      
      const transcript = String(transcription);
      console.log(`[SOCIAL_MEDIA] Transcription complete: ${transcript.length} chars`);
      
      return transcript.trim() || undefined;

    } catch (error: any) {
      console.error(`[SOCIAL_MEDIA] Transcription error:`, error.message);
      return undefined;
    } finally {
      this.cleanupFile(audioPath);
    }
  }

  private async extractVideoFramesAndOCR(videoPath: string): Promise<string | undefined> {
    try {
      const framesDir = path.join(this.tempDir, `frames_${Date.now()}`);
      fs.mkdirSync(framesDir, { recursive: true });

      console.log(`[SOCIAL_MEDIA] Extracting video frames...`);
      
      await execAsync(
        `ffmpeg -i "${videoPath}" -vf "fps=1/2,scale=1280:-1" -frames:v 10 "${framesDir}/frame_%03d.jpg"`,
        { timeout: 60000 }
      );

      const frameFiles = fs.readdirSync(framesDir)
        .filter(f => f.endsWith('.jpg'))
        .sort()
        .slice(0, 5);

      if (frameFiles.length === 0) {
        console.log(`[SOCIAL_MEDIA] No frames extracted`);
        fs.rmSync(framesDir, { recursive: true, force: true });
        return undefined;
      }

      console.log(`[SOCIAL_MEDIA] Running OCR on ${frameFiles.length} frames...`);
      
      const ocrResults: string[] = [];
      
      for (const frameFile of frameFiles) {
        const framePath = path.join(framesDir, frameFile);
        const ocrText = await this.performOCR(framePath);
        if (ocrText && ocrText.trim().length > 5) {
          ocrResults.push(ocrText.trim());
        }
      }

      fs.rmSync(framesDir, { recursive: true, force: true });

      if (ocrResults.length === 0) {
        return undefined;
      }

      const uniqueTexts = Array.from(new Set(ocrResults));
      const combinedText = uniqueTexts.join('\n---\n');
      console.log(`[SOCIAL_MEDIA] OCR complete: ${combinedText.length} chars from ${uniqueTexts.length} unique frames`);
      
      return combinedText;

    } catch (error: any) {
      console.error(`[SOCIAL_MEDIA] Frame extraction/OCR error:`, error.message);
      return undefined;
    }
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
