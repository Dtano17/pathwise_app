interface SocialMediaExtractionResult {
  success: boolean;
  platform?: string;
  videoId?: string;
  caption?: string;
  transcript?: string;
  ocrText?: string;
  metadata?: {
    author?: string;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  error?: string;
}

class SocialMediaVideoService {
  private platformPatterns: { [key: string]: RegExp[] } = {
    instagram: [
      /instagram\.com\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/,
      /instagr\.am\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/,
    ],
    tiktok: [
      /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
      /tiktok\.com\/t\/([A-Za-z0-9]+)/,
      /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
    ],
    youtube: [
      /youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
      /youtu\.be\/([A-Za-z0-9_-]+)/,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]+)/,
    ],
    twitter: [
      /twitter\.com\/\w+\/status\/(\d+)/,
      /x\.com\/\w+\/status\/(\d+)/,
    ],
    facebook: [
      /facebook\.com\/.*\/videos\/(\d+)/,
      /fb\.watch\/([A-Za-z0-9_-]+)/,
    ],
    reddit: [
      /reddit\.com\/r\/\w+\/comments\/([A-Za-z0-9]+)/,
    ],
    pinterest: [
      /pinterest\.com\/pin\/(\d+)/,
    ],
  };

  detectPlatform(url: string): string | null {
    if (!url) return null;
    
    const normalizedUrl = url.toLowerCase();
    
    for (const [platform, patterns] of Object.entries(this.platformPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedUrl) || pattern.test(url)) {
          return platform;
        }
      }
    }
    
    if (normalizedUrl.includes('instagram.com')) return 'instagram';
    if (normalizedUrl.includes('tiktok.com') || normalizedUrl.includes('vm.tiktok.com')) return 'tiktok';
    if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) return 'youtube';
    if (normalizedUrl.includes('twitter.com') || normalizedUrl.includes('x.com')) return 'twitter';
    if (normalizedUrl.includes('facebook.com') || normalizedUrl.includes('fb.watch')) return 'facebook';
    if (normalizedUrl.includes('reddit.com')) return 'reddit';
    if (normalizedUrl.includes('pinterest.com')) return 'pinterest';
    
    return null;
  }

  async extractContent(url: string): Promise<SocialMediaExtractionResult> {
    const platform = this.detectPlatform(url);
    
    if (!platform) {
      return {
        success: false,
        error: 'Unsupported platform or invalid URL'
      };
    }

    try {
      console.log(`[SOCIAL-MEDIA] Attempting to extract content from ${platform}: ${url}`);
      
      return {
        success: false,
        platform,
        error: 'Social media extraction service not configured. Please provide content directly or use a text-based URL.'
      };
    } catch (error) {
      console.error(`[SOCIAL-MEDIA] Extraction failed for ${url}:`, error);
      return {
        success: false,
        platform,
        error: error instanceof Error ? error.message : 'Unknown extraction error'
      };
    }
  }

  combineExtractedContent(result: SocialMediaExtractionResult): string {
    const parts: string[] = [];
    
    if (result.caption) {
      parts.push(`Caption: ${result.caption}`);
    }
    
    if (result.transcript) {
      parts.push(`Transcript: ${result.transcript}`);
    }
    
    if (result.ocrText) {
      parts.push(`Visual Text: ${result.ocrText}`);
    }
    
    if (result.metadata?.author) {
      parts.push(`Author: ${result.metadata.author}`);
    }
    
    return parts.join('\n\n') || 'No content extracted';
  }

  extractVideoId(url: string): string | null {
    const platform = this.detectPlatform(url);
    if (!platform) return null;
    
    const patterns = this.platformPatterns[platform];
    if (!patterns) return null;
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
}

export const socialMediaVideoService = new SocialMediaVideoService();
