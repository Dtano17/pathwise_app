/**
 * Unsplash Service - High-resolution image suggestions for share cards
 *
 * Free tier limits: 50 requests/hour
 * Requires UNSPLASH_ACCESS_KEY environment variable
 *
 * Documentation: https://unsplash.com/documentation
 */

interface UnsplashImage {
  id: string;
  url: string;
  downloadUrl: string;
  width: number;
  height: number;
  description: string | null;
  altDescription: string | null;
  photographer: string;
  photographerUrl: string;
  quality: 'high' | 'medium';
}

interface UnsplashSearchParams {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  perPage?: number;
}

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

export class UnsplashService {
  private accessKey: string;
  private usePublicFallback: boolean;

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
    this.usePublicFallback = !this.accessKey;

    if (this.usePublicFallback) {
      console.warn('[UnsplashService] No UNSPLASH_ACCESS_KEY found, using fallback images');
    }
  }

  /**
   * Get high-resolution backdrop suggestions based on activity category and content
   */
  async getSuggestedBackdrops(
    category: string,
    activityTitle?: string,
    orientation: 'landscape' | 'portrait' = 'landscape',
    count: number = 6
  ): Promise<UnsplashImage[]> {
    // If no API key, return fallback images
    if (this.usePublicFallback) {
      return this.getFallbackImages(category, orientation, count);
    }

    try {
      // Build search query from category and title
      const query = this.buildSearchQuery(category, activityTitle);

      const params = new URLSearchParams({
        query,
        orientation,
        per_page: count.toString(),
        client_id: this.accessKey,
      });

      const response = await fetch(`${UNSPLASH_API_BASE}/search/photos?${params}`);

      if (!response.ok) {
        console.error('[UnsplashService] API error:', response.status, response.statusText);
        return this.getFallbackImages(category, orientation, count);
      }

      const data = await response.json();

      return (data.results || []).map((photo: any) => ({
        id: photo.id,
        url: `${photo.urls.regular}&w=1920&q=90`, // High resolution, 90% quality
        downloadUrl: photo.links.download_location,
        width: photo.width,
        height: photo.height,
        description: photo.description,
        altDescription: photo.alt_description,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        quality: photo.width >= 1920 ? 'high' : 'medium',
      }));
    } catch (error) {
      console.error('[UnsplashService] Search failed:', error);
      return this.getFallbackImages(category, orientation, count);
    }
  }

  /**
   * Download location tracking (required by Unsplash API guidelines)
   */
  async trackDownload(downloadUrl: string): Promise<void> {
    if (this.usePublicFallback || !downloadUrl) return;

    try {
      await fetch(downloadUrl, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
      });
    } catch (error) {
      console.error('[UnsplashService] Download tracking failed:', error);
    }
  }

  /**
   * Build search query from category and activity title
   */
  private buildSearchQuery(category: string, activityTitle?: string): string {
    // Extract keywords from title if available
    const titleKeywords = activityTitle
      ? activityTitle
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(' ')
          .filter(word => word.length > 3)
          .slice(0, 2) // Take first 2 meaningful words
          .join(' ')
      : '';

    // Category-to-search mapping
    const categoryQueries: Record<string, string> = {
      travel: 'travel destination scenic landscape',
      fitness: 'fitness gym workout exercise',
      health: 'health wellness meditation nature',
      work: 'workspace productivity office minimal',
      career: 'business professional success growth',
      learning: 'education books study knowledge',
      finance: 'finance money growth investment',
      relationships: 'people connection togetherness love',
      creativity: 'art creative design inspiration',
      home: 'home interior cozy comfortable',
      personal: 'lifestyle personal growth mindfulness',
      adventure: 'adventure outdoors hiking mountains',
      food: 'food culinary dining restaurant',
      entertainment: 'entertainment concert festival fun',
      shopping: 'shopping retail fashion lifestyle',
      other: 'lifestyle modern aesthetic minimal',
    };

    const baseQuery = categoryQueries[category] || categoryQueries.other;

    // Combine title keywords with category query
    return titleKeywords ? `${titleKeywords} ${baseQuery}` : baseQuery;
  }

  /**
   * Fallback high-resolution images when Unsplash API is unavailable
   */
  private getFallbackImages(
    category: string,
    orientation: 'landscape' | 'portrait',
    count: number
  ): UnsplashImage[] {
    // High-resolution fallback images from Unsplash public URLs
    const fallbacksByCategory: Record<string, string[]> = {
      travel: [
        'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=90', // Travel
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=90', // Mountain
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=90', // Beach
        'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1920&q=90', // City
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=90', // Nature
        'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1920&q=90', // Road
      ],
      fitness: [
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&q=90', // Gym
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=90', // Workout
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=90', // Fitness
        'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&q=90', // Running
        'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&q=90', // Yoga
        'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1920&q=90', // Exercise
      ],
      health: [
        'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1920&q=90', // Wellness
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920&q=90', // Meditation
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=90', // Nature
        'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=90', // Health food
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=90', // Mindfulness
        'https://images.unsplash.com/photo-1506126279646-a697353d3166?w=1920&q=90', // Peace
      ],
      work: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=90', // Office
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1920&q=90', // Workspace
        'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1920&q=90', // Desk
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1920&q=90', // Business
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=90', // Corporate
        'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1920&q=90', // Laptop
      ],
      creativity: [
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1920&q=90', // Art
        'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1920&q=90', // Creative
        'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1920&q=90', // Design
        'https://images.unsplash.com/photo-1506784693919-94af1d77f7a0?w=1920&q=90', // Colors
        'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=1920&q=90', // Inspiration
        'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1920&q=90', // Abstract
      ],
      other: [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=90', // Nature
        'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1920&q=90', // Minimalist
        'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=1920&q=90', // Modern
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=90', // Lifestyle
        'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1920&q=90', // Aesthetic
        'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=90', // Inspiration
      ],
    };

    const categoryImages = fallbacksByCategory[category] || fallbacksByCategory.other;
    const selectedImages = categoryImages.slice(0, count);

    return selectedImages.map((url, index) => ({
      id: `fallback-${category}-${index}`,
      url,
      downloadUrl: '',
      width: 1920,
      height: 1080,
      description: `${category} backdrop ${index + 1}`,
      altDescription: `High-quality ${category} image`,
      photographer: 'Unsplash',
      photographerUrl: 'https://unsplash.com',
      quality: 'high',
    }));
  }

  /**
   * Validate image quality (minimum dimensions for high-res share cards)
   */
  static validateImageQuality(width: number, height: number): {
    isHighQuality: boolean;
    recommendation?: string;
  } {
    const MIN_WIDTH = 1920;
    const MIN_HEIGHT = 1080;

    if (width >= MIN_WIDTH && height >= MIN_HEIGHT) {
      return { isHighQuality: true };
    }

    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      return {
        isHighQuality: false,
        recommendation: `Image resolution is ${width}x${height}px. For best quality, use images at least ${MIN_WIDTH}x${MIN_HEIGHT}px.`,
      };
    }

    return { isHighQuality: true };
  }
}
