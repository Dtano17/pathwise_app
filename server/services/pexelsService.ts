/**
 * Pexels Service - High-resolution image suggestions for share cards
 *
 * FREE tier: 200 requests/hour, 20,000 requests/month
 * Requires PEXELS_API_KEY environment variable
 * Documentation: https://www.pexels.com/api/documentation/
 */

export interface PexelsImage {
  id: number;
  url: string;
  width: number;
  height: number;
  description: string | null;
  photographer: string;
  photographerUrl: string;
  quality: 'high' | 'medium';
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string | null;
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

const PEXELS_API_BASE = 'https://api.pexels.com/v1';

export class PexelsService {
  private apiKey: string;
  private usePublicFallback: boolean;

  constructor() {
    this.apiKey = process.env.PEXELS_API_KEY || '';
    this.usePublicFallback = !this.apiKey;

    if (this.usePublicFallback) {
      console.warn('[PexelsService] No PEXELS_API_KEY found, using fallback images');
    }
  }

  /**
   * Get backdrop suggestions based on activity category and content
   */
  async getSuggestedBackdrops(
    category: string,
    activityTitle?: string,
    orientation: 'landscape' | 'portrait' = 'landscape',
    count: number = 6
  ): Promise<PexelsImage[]> {
    if (this.usePublicFallback) {
      return this.getFallbackImages(category, count);
    }

    try {
      const query = this.buildSearchQuery(category, activityTitle);

      const response = await fetch(
        `${PEXELS_API_BASE}/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=${count}`,
        {
          headers: {
            'Authorization': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        console.error('[PexelsService] API error:', response.status, response.statusText);
        return this.getFallbackImages(category, count);
      }

      const data: PexelsSearchResponse = await response.json();

      return (data.photos || []).map((photo: PexelsPhoto) => ({
        id: photo.id,
        url: photo.src.large2x || photo.src.large, // High resolution
        width: photo.width,
        height: photo.height,
        description: photo.alt,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        quality: photo.width >= 1920 ? 'high' as const : 'medium' as const,
      }));
    } catch (error) {
      console.error('[PexelsService] Search failed:', error);
      return this.getFallbackImages(category, count);
    }
  }

  /**
   * Build search query from category and activity title
   * Enhanced to extract locations, events, and meaningful keywords
   */
  private buildSearchQuery(category: string, activityTitle?: string): string {
    if (!activityTitle) {
      return this.getCategoryQuery(category);
    }

    const titleLower = activityTitle.toLowerCase();

    // 1. Extract location if present
    const location = this.extractLocation(titleLower);

    // 2. Extract event/occasion type
    const event = this.extractEvent(titleLower);

    // 3. Extract activity keywords
    const activityKeywords = this.extractActivityKeywords(titleLower);

    // Build contextual query
    let query = '';

    if (location) {
      query = location;
      if (event) {
        query += ` ${event}`;
      } else if (activityKeywords) {
        query += ` ${activityKeywords}`;
      }
      query += ' scenic';
    } else if (event) {
      query = `${event} celebration`;
      if (activityKeywords) {
        query += ` ${activityKeywords}`;
      }
    } else if (activityKeywords) {
      query = `${activityKeywords} ${this.getCategoryQuery(category)}`;
    } else {
      query = this.getCategoryQuery(category);
    }

    console.log(`[PexelsService] Built query: "${query}" from title: "${activityTitle}"`);
    return query;
  }

  /**
   * Extract location/city from title
   */
  private extractLocation(text: string): string | null {
    const locations: Record<string, string> = {
      'los angeles': 'Los Angeles city skyline',
      'la': 'Los Angeles California',
      'new york': 'New York City skyline',
      'nyc': 'New York City',
      'manhattan': 'Manhattan New York',
      'paris': 'Paris France Eiffel',
      'london': 'London England',
      'tokyo': 'Tokyo Japan',
      'miami': 'Miami Florida beach',
      'las vegas': 'Las Vegas Nevada',
      'vegas': 'Las Vegas lights',
      'san francisco': 'San Francisco bridge',
      'chicago': 'Chicago skyline',
      'hawaii': 'Hawaii beach tropical',
      'cancun': 'Cancun beach Mexico',
      'dubai': 'Dubai skyline',
      'barcelona': 'Barcelona Spain',
      'rome': 'Rome Italy',
      'big bear': 'mountain snow cabin',
      'lake tahoe': 'Lake Tahoe snow',
      'aspen': 'Aspen Colorado ski',
      'malibu': 'Malibu beach sunset',
      'santa monica': 'Santa Monica pier beach',
      'hollywood': 'Hollywood Los Angeles',
      'times square': 'Times Square New York lights',
    };

    for (const [key, value] of Object.entries(locations)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(text)) {
        return value;
      }
    }
    return null;
  }

  /**
   * Extract event/occasion type from title
   */
  private extractEvent(text: string): string | null {
    const events: Record<string, string> = {
      'new year': 'New Years Eve fireworks',
      'nye': 'New Years party celebration',
      'christmas': 'Christmas holiday lights',
      'halloween': 'Halloween party',
      'thanksgiving': 'Thanksgiving dinner',
      'valentine': 'Valentine romantic',
      'birthday': 'birthday party celebration',
      'wedding': 'wedding elegant',
      'anniversary': 'anniversary celebration',
      'party': 'party celebration nightlife',
      'club': 'nightclub party lights',
      'concert': 'concert music live',
      'festival': 'festival crowd celebration',
      'brunch': 'brunch restaurant',
      'dinner': 'dinner restaurant elegant',
      'date night': 'romantic dinner date',
    };

    for (const [key, value] of Object.entries(events)) {
      if (text.includes(key)) {
        return value;
      }
    }
    return null;
  }

  /**
   * Extract meaningful activity keywords from title
   */
  private extractActivityKeywords(text: string): string | null {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'from', 'by', 'my', 'your', 'our', 'their', 'this',
      'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'best', 'top', 'most', 'how', 'what', 'why', 'when', 'where',
      '10', '5', '7', '20', 'moves', 'things', 'ideas', 'ways', 'tips'
    ]);

    const words = text
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 3);

    return words.length > 0 ? words.join(' ') : null;
  }

  /**
   * Get category-specific search query
   */
  private getCategoryQuery(category: string): string {
    const categoryQueries: Record<string, string> = {
      travel: 'travel destination landscape scenery',
      fitness: 'fitness gym workout exercise sports',
      health: 'wellness meditation yoga nature peaceful',
      work: 'workspace office desk modern minimal',
      career: 'business professional success corporate',
      learning: 'books education study library',
      finance: 'finance growth investment abstract',
      relationships: 'people together love happiness',
      creativity: 'art creative design colorful inspiration',
      home: 'home interior cozy comfortable living',
      personal: 'lifestyle mindfulness growth journey',
      adventure: 'adventure outdoors hiking mountains nature',
      food: 'food restaurant culinary cooking',
      entertainment: 'entertainment concert festival celebration',
      shopping: 'shopping retail fashion lifestyle',
      other: 'lifestyle modern aesthetic nature',
    };

    return categoryQueries[category?.toLowerCase()] || categoryQueries.other;
  }

  /**
   * Fallback images when Pexels API is unavailable
   * Using curated Pexels public URLs
   */
  private getFallbackImages(category: string, count: number): PexelsImage[] {
    // Curated Pexels fallback images by category
    const fallbacksByCategory: Record<string, string[]> = {
      travel: [
        'https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1820563/pexels-photo-1820563.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/2325446/pexels-photo-2325446.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/2245436/pexels-photo-2245436.png?auto=compress&cs=tinysrgb&w=1920',
      ],
      fitness: [
        'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3076509/pexels-photo-3076509.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      health: [
        'https://images.pexels.com/photos/3820380/pexels-photo-3820380.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3759657/pexels-photo-3759657.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1051449/pexels-photo-1051449.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      work: [
        'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3184287/pexels-photo-3184287.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      career: [
        'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1181355/pexels-photo-1181355.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      creativity: [
        'https://images.pexels.com/photos/1509534/pexels-photo-1509534.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1191710/pexels-photo-1191710.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1762851/pexels-photo-1762851.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1484759/pexels-photo-1484759.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1183992/pexels-photo-1183992.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      adventure: [
        'https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1659438/pexels-photo-1659438.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1366909/pexels-photo-1366909.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/2387418/pexels-photo-2387418.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      food: [
        'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1565982/pexels-photo-1565982.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      entertainment: [
        'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/976866/pexels-photo-976866.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/210922/pexels-photo-210922.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      learning: [
        'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1370296/pexels-photo-1370296.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/289737/pexels-photo-289737.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/590493/pexels-photo-590493.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      home: [
        'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/2029731/pexels-photo-2029731.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      personal: [
        'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3075993/pexels-photo-3075993.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/747964/pexels-photo-747964.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/733852/pexels-photo-733852.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1194420/pexels-photo-1194420.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/688660/pexels-photo-688660.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
      other: [
        'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3075993/pexels-photo-3075993.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=1920',
        'https://images.pexels.com/photos/1486974/pexels-photo-1486974.jpeg?auto=compress&cs=tinysrgb&w=1920',
      ],
    };

    const images = fallbacksByCategory[category.toLowerCase()] || fallbacksByCategory.other;
    return images.slice(0, count).map((url, index) => ({
      id: index,
      url,
      width: 1920,
      height: 1080,
      description: `${category} backdrop`,
      photographer: 'Pexels',
      photographerUrl: 'https://pexels.com',
      quality: 'high' as const,
    }));
  }

  /**
   * Check if the service has API access (not using fallbacks)
   */
  isAvailable(): boolean {
    return !this.usePublicFallback;
  }
}

// Export singleton instance
export const pexelsService = new PexelsService();
