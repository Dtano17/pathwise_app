/**
 * Journal Web Enrichment Service
 *
 * Fetches real-world data about journal entries from the web to make them
 * more dynamic, actionable, and visually rich.
 *
 * Features:
 * - Venue lookup via Tavily/Claude web search
 * - Smart category mapping based on verified venue types
 * - Photo/media URL extraction
 * - Location enrichment with Google Maps links
 * - Price range and rating extraction
 * - Reservation/booking link detection
 */

import { tavily } from '@tavily/core';
import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// TYPES
// ============================================================================

export interface WebEnrichedData {
  // Venue/Location Info
  venueVerified: boolean;
  venueType?: string; // nightclub, bar, restaurant, concert_venue, hotel, attraction, etc.
  venueName?: string;
  venueDescription?: string;

  // Location
  location?: {
    address?: string;
    city?: string;
    neighborhood?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
    directionsUrl?: string; // Google Maps link
  };

  // Business Details
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  rating?: number; // 0-5
  reviewCount?: number;
  businessHours?: string;
  phone?: string;
  website?: string;
  reservationUrl?: string;

  // Media
  mediaUrls?: Array<{
    url: string;
    type: 'image' | 'video';
    source?: string;
    alt?: string;
  }>;
  primaryImageUrl?: string;

  // Category Mapping
  suggestedCategory?: string; // Based on verified venue type
  categoryConfidence?: number;

  // Metadata
  enrichedAt: string;
  enrichmentSource: 'tavily' | 'claude' | 'google' | 'manual';
  rawSearchResults?: any;
}

export interface JournalEntryForEnrichment {
  id: string;
  text: string;
  category: string;
  venueName?: string;
  location?: { city?: string; country?: string };
  existingEnrichment?: WebEnrichedData;
}

export interface EnrichmentResult {
  entryId: string;
  success: boolean;
  enrichedData?: WebEnrichedData;
  error?: string;
}

// ============================================================================
// VENUE TYPE TO CATEGORY MAPPING
// ============================================================================

const VENUE_TYPE_TO_CATEGORY: Record<string, string> = {
  // Dining & Drinks
  restaurant: 'restaurants',
  cafe: 'restaurants',
  coffee_shop: 'restaurants',
  bar: 'restaurants', // Could also be 'bars' if that category exists
  pub: 'restaurants',
  lounge: 'restaurants',
  nightclub: 'activities', // Events/Activities
  wine_bar: 'restaurants',
  brewery: 'restaurants',
  bakery: 'restaurants',

  // Entertainment
  movie_theater: 'movies',
  cinema: 'movies',
  concert_venue: 'music',
  theater: 'activities',
  comedy_club: 'activities',
  arena: 'music',
  stadium: 'activities',

  // Travel & Places
  hotel: 'travel',
  resort: 'travel',
  hostel: 'travel',
  airbnb: 'travel',
  vacation_rental: 'travel',
  attraction: 'travel',
  landmark: 'travel',
  museum: 'travel',
  park: 'travel',
  beach: 'travel',
  airport: 'travel',

  // Shopping
  store: 'shopping',
  mall: 'shopping',
  boutique: 'style',
  fashion_store: 'style',
  bookstore: 'books',

  // Fitness & Wellness
  gym: 'fitness',
  spa: 'fitness',
  yoga_studio: 'fitness',
  fitness_center: 'fitness',

  // Other
  library: 'books',
  school: 'books',
  office: 'notes',
  unknown: 'notes',
};

// Category-specific icons (emoji)
const CATEGORY_ICONS: Record<string, string> = {
  restaurants: '🍽️',
  movies: '🎬',
  music: '🎵',
  books: '📚',
  hobbies: '🎨',
  travel: '✈️',
  style: '👗',
  favorites: '⭐',
  notes: '📝',
  activities: '🎭',
  shopping: '🛍️',
  fitness: '💪',
};

// Venue type specific icons
const VENUE_TYPE_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍸',
  nightclub: '🪩',
  pub: '🍺',
  lounge: '🛋️',
  movie_theater: '🎬',
  concert_venue: '🎤',
  theater: '🎭',
  hotel: '🏨',
  resort: '🏖️',
  museum: '🏛️',
  park: '🌳',
  beach: '🏖️',
  gym: '🏋️',
  spa: '💆',
  store: '🏪',
  mall: '🛒',
  bookstore: '📖',
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

class JournalWebEnrichmentService {
  private tavilyClient: ReturnType<typeof tavily> | null = null;
  private anthropic: Anthropic | null = null;
  private cache: Map<string, { data: WebEnrichedData; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours

  constructor() {
    if (process.env.TAVILY_API_KEY) {
      this.tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  // ==========================================================================
  // MAIN ENRICHMENT METHOD
  // ==========================================================================

  async enrichJournalEntry(entry: JournalEntryForEnrichment): Promise<EnrichmentResult> {
    const startTime = Date.now();
    console.log(`[JOURNAL_WEB_ENRICH] Enriching entry ${entry.id}: "${entry.text.substring(0, 50)}..."`);

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(entry);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log(`[JOURNAL_WEB_ENRICH] Cache hit for ${entry.id}`);
        return { entryId: entry.id, success: true, enrichedData: cached.data };
      }

      // Extract venue name and location from text if not provided
      const extractedInfo = this.extractVenueInfo(entry.text);
      const venueName = entry.venueName || extractedInfo.venueName;
      const city = entry.location?.city || extractedInfo.city;

      if (!venueName) {
        console.log(`[JOURNAL_WEB_ENRICH] No venue name found in entry ${entry.id}`);
        return {
          entryId: entry.id,
          success: false,
          error: 'No venue name detected'
        };
      }

      // Build search query
      const searchQuery = this.buildSearchQuery(venueName, city, entry.category);

      // Search web for venue info
      const searchResults = await this.searchWeb(searchQuery);

      if (!searchResults || searchResults.length === 0) {
        console.log(`[JOURNAL_WEB_ENRICH] No search results for ${venueName}`);
        return {
          entryId: entry.id,
          success: false,
          error: 'No web results found'
        };
      }

      // Parse and structure the results
      const enrichedData = await this.parseSearchResults(searchResults, venueName, city, entry.category);

      // Cache the result
      this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });

      const elapsed = Date.now() - startTime;
      console.log(`[JOURNAL_WEB_ENRICH] Enriched ${entry.id} in ${elapsed}ms - venue type: ${enrichedData.venueType}, category: ${enrichedData.suggestedCategory}`);

      return {
        entryId: entry.id,
        success: true,
        enrichedData
      };

    } catch (error) {
      console.error(`[JOURNAL_WEB_ENRICH] Error enriching ${entry.id}:`, error);
      return {
        entryId: entry.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================================================
  // BATCH ENRICHMENT
  // ==========================================================================

  async enrichBatch(entries: JournalEntryForEnrichment[]): Promise<EnrichmentResult[]> {
    console.log(`[JOURNAL_WEB_ENRICH] Starting batch enrichment for ${entries.length} entries`);

    // Filter entries that need enrichment
    const needsEnrichment = entries.filter(entry => {
      // Skip if already enriched recently
      if (entry.existingEnrichment?.enrichedAt) {
        const enrichedTime = new Date(entry.existingEnrichment.enrichedAt).getTime();
        if (Date.now() - enrichedTime < this.CACHE_TTL) {
          return false;
        }
      }
      return true;
    });

    console.log(`[JOURNAL_WEB_ENRICH] ${needsEnrichment.length} entries need enrichment`);

    // Process in parallel with rate limiting (max 3 concurrent)
    const results: EnrichmentResult[] = [];
    const batchSize = 3;

    for (let i = 0; i < needsEnrichment.length; i += batchSize) {
      const batch = needsEnrichment.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(entry => this.enrichJournalEntry(entry))
      );
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < needsEnrichment.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[JOURNAL_WEB_ENRICH] Batch complete: ${successCount}/${results.length} successful`);

    return results;
  }

  // ==========================================================================
  // VENUE INFO EXTRACTION
  // ==========================================================================

  private extractVenueInfo(text: string): { venueName?: string; city?: string } {
    // Pattern: "VenueName - Description" or "VenueName (City)"
    const patterns = [
      /^["']?([A-Z][^-–—]+?)["']?\s*[-–—]\s*/i, // "Name - description"
      /^["']?([A-Z][^(]+?)["']?\s*\(([^)]+)\)/i, // "Name (City)"
      /(?:at|visit(?:ed)?|tried|went to)\s+["']?([A-Z][A-Za-z0-9\s'&-]{2,40})["']?/i, // "visited Name"
      /^([A-Z][A-Za-z0-9\s'&-]{2,30})\s+(?:restaurant|cafe|bar|hotel|resort|museum)/i, // "Name restaurant"
    ];

    let venueName: string | undefined;
    let city: string | undefined;

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        venueName = match[1]?.trim();
        if (match[2]) {
          city = match[2]?.trim();
        }
        break;
      }
    }

    // Try to extract city from text
    if (!city) {
      const cityPatterns = [
        /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/,
      ];
      for (const pattern of cityPatterns) {
        const match = text.match(pattern);
        if (match) {
          city = match[1];
          break;
        }
      }
    }

    return { venueName, city };
  }

  private buildSearchQuery(venueName: string, city?: string, category?: string): string {
    let query = venueName;

    if (city) {
      query += ` ${city}`;
    }

    // Add category hint for better results
    if (category) {
      const categoryHints: Record<string, string> = {
        restaurants: 'restaurant',
        movies: 'movie theater cinema',
        music: 'concert venue',
        travel: 'hotel destination',
        activities: 'venue',
      };
      if (categoryHints[category]) {
        query += ` ${categoryHints[category]}`;
      }
    }

    return query;
  }

  // ==========================================================================
  // WEB SEARCH
  // ==========================================================================

  private async searchWeb(query: string): Promise<any[]> {
    if (!this.tavilyClient) {
      console.warn('[JOURNAL_WEB_ENRICH] Tavily client not initialized');
      return [];
    }

    try {
      const response = await this.tavilyClient.search(query, {
        searchDepth: 'basic',
        maxResults: 5,
        includeImages: true,
        includeAnswer: true,
      });

      return response.results || [];
    } catch (error) {
      console.error('[JOURNAL_WEB_ENRICH] Tavily search failed:', error);
      return [];
    }
  }

  // ==========================================================================
  // RESULT PARSING
  // ==========================================================================

  private async parseSearchResults(
    results: any[],
    venueName: string,
    city?: string,
    category?: string
  ): Promise<WebEnrichedData> {
    const enrichedData: WebEnrichedData = {
      venueVerified: false,
      venueName,
      enrichedAt: new Date().toISOString(),
      enrichmentSource: 'tavily',
      rawSearchResults: results.slice(0, 3), // Keep top 3 for reference
    };

    // Extract data from search results
    const combinedContent = results.map(r => r.content || '').join('\n');
    const urls = results.map(r => r.url).filter(Boolean);

    // Extract images
    const imageUrls = results
      .flatMap(r => r.images || [])
      .filter((url: string) => url && !url.includes('logo') && !url.includes('icon'))
      .slice(0, 5);

    if (imageUrls.length > 0) {
      enrichedData.primaryImageUrl = imageUrls[0];
      enrichedData.mediaUrls = imageUrls.map((url: string) => ({
        url,
        type: 'image' as const,
        source: 'web_search'
      }));
    }

    // Use AI to extract structured data
    if (this.anthropic) {
      try {
        const structuredData = await this.extractStructuredDataWithAI(
          combinedContent,
          venueName,
          city,
          category
        );
        Object.assign(enrichedData, structuredData);
      } catch (error) {
        console.warn('[JOURNAL_WEB_ENRICH] AI extraction failed:', error);
        // Fall back to regex extraction
        Object.assign(enrichedData, this.extractWithRegex(combinedContent, urls));
      }
    } else {
      Object.assign(enrichedData, this.extractWithRegex(combinedContent, urls));
    }

    // Set suggested category based on venue type
    if (enrichedData.venueType) {
      enrichedData.suggestedCategory = VENUE_TYPE_TO_CATEGORY[enrichedData.venueType] || category || 'notes';
      enrichedData.categoryConfidence = 0.85;
    }

    // Generate Google Maps link if we have address
    if (enrichedData.location?.address || venueName) {
      const mapQuery = encodeURIComponent(
        enrichedData.location?.address || `${venueName}${city ? `, ${city}` : ''}`
      );
      enrichedData.location = enrichedData.location || {};
      enrichedData.location.directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
    }

    enrichedData.venueVerified = true;

    return enrichedData;
  }

  private async extractStructuredDataWithAI(
    content: string,
    venueName: string,
    city?: string,
    category?: string
  ): Promise<Partial<WebEnrichedData>> {
    if (!this.anthropic) return {};

    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract structured venue information from this web content about "${venueName}"${city ? ` in ${city}` : ''}.

Content:
${content.substring(0, 2000)}

Return JSON with these fields (omit if not found):
{
  "venueType": "restaurant|bar|nightclub|cafe|hotel|museum|concert_venue|theater|attraction|park|gym|spa|store|other",
  "venueDescription": "brief description",
  "address": "full street address",
  "city": "city name",
  "neighborhood": "neighborhood/area",
  "priceRange": "$|$$|$$$|$$$$",
  "rating": 0-5 number,
  "reviewCount": number,
  "businessHours": "hours summary",
  "phone": "phone number",
  "website": "main website URL",
  "reservationUrl": "booking/reservation URL if applicable"
}

Return only valid JSON, no explanation.`
      }]
    });

    const textContent = response.content[0];
    if (textContent.type !== 'text') return {};

    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return {};

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        venueType: parsed.venueType,
        venueDescription: parsed.venueDescription,
        location: {
          address: parsed.address,
          city: parsed.city || city,
          neighborhood: parsed.neighborhood,
        },
        priceRange: parsed.priceRange,
        rating: parsed.rating,
        reviewCount: parsed.reviewCount,
        businessHours: parsed.businessHours,
        phone: parsed.phone,
        website: parsed.website,
        reservationUrl: parsed.reservationUrl,
      };
    } catch (error) {
      console.warn('[JOURNAL_WEB_ENRICH] Failed to parse AI response:', error);
      return {};
    }
  }

  private extractWithRegex(content: string, urls: string[]): Partial<WebEnrichedData> {
    const extracted: Partial<WebEnrichedData> = {};

    // Price range
    const priceMatch = content.match(/\$\$?\$?\$?(?=\s|$)/);
    if (priceMatch) {
      extracted.priceRange = priceMatch[0] as '$' | '$$' | '$$$' | '$$$$';
    }

    // Rating
    const ratingMatch = content.match(/(\d(?:\.\d)?)\s*(?:\/\s*5|stars?|out of 5)/i);
    if (ratingMatch) {
      extracted.rating = parseFloat(ratingMatch[1]);
    }

    // Phone
    const phoneMatch = content.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      extracted.phone = phoneMatch[0];
    }

    // Find reservation URLs
    const reservationUrl = urls.find(url =>
      /opentable|resy|yelp.*reservations|bookatable|sevenrooms/i.test(url)
    );
    if (reservationUrl) {
      extracted.reservationUrl = reservationUrl;
    }

    // Find main website
    const websiteUrl = urls.find(url =>
      !url.includes('yelp') && !url.includes('tripadvisor') && !url.includes('google')
    );
    if (websiteUrl) {
      extracted.website = websiteUrl;
    }

    return extracted;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private generateCacheKey(entry: JournalEntryForEnrichment): string {
    const venueName = entry.venueName || this.extractVenueInfo(entry.text).venueName || '';
    const city = entry.location?.city || '';
    return `${venueName.toLowerCase().replace(/\s+/g, '_')}_${city.toLowerCase()}`;
  }

  getVenueIcon(venueType?: string): string {
    if (!venueType) return '📍';
    return VENUE_TYPE_ICONS[venueType] || '📍';
  }

  getCategoryIcon(category: string): string {
    return CATEGORY_ICONS[category] || '📝';
  }

  mapVenueTypeToCategory(venueType: string): string {
    return VENUE_TYPE_TO_CATEGORY[venueType] || 'notes';
  }

  // ==========================================================================
  // CATEGORY SUGGESTION
  // ==========================================================================

  getSuggestedCategoryForEntry(entry: JournalEntryForEnrichment): {
    category: string;
    icon: string;
    confidence: number;
  } {
    // If we have web-enriched venue type, use that
    if (entry.existingEnrichment?.venueType) {
      const category = VENUE_TYPE_TO_CATEGORY[entry.existingEnrichment.venueType] || entry.category;
      return {
        category,
        icon: VENUE_TYPE_ICONS[entry.existingEnrichment.venueType] || CATEGORY_ICONS[category] || '📝',
        confidence: entry.existingEnrichment.categoryConfidence || 0.85
      };
    }

    // Fall back to text analysis
    const text = entry.text.toLowerCase();

    const categoryPatterns: Array<{ pattern: RegExp; category: string; icon: string }> = [
      { pattern: /restaurant|cafe|diner|bistro|eatery|food|cuisine|dish|meal/i, category: 'restaurants', icon: '🍽️' },
      { pattern: /bar|pub|lounge|cocktail|beer|wine|drinks?/i, category: 'restaurants', icon: '🍸' },
      { pattern: /nightclub|club|dancing|dj|party venue/i, category: 'activities', icon: '🪩' },
      { pattern: /movie|cinema|film|theater|screening/i, category: 'movies', icon: '🎬' },
      { pattern: /concert|music|live show|band|artist|album/i, category: 'music', icon: '🎵' },
      { pattern: /hotel|resort|airbnb|hostel|stay|vacation|trip|travel|visit/i, category: 'travel', icon: '✈️' },
      { pattern: /museum|gallery|exhibit|art|attraction/i, category: 'travel', icon: '🏛️' },
      { pattern: /book|read|author|novel|library/i, category: 'books', icon: '📚' },
      { pattern: /shop|store|buy|purchase|mall|boutique/i, category: 'shopping', icon: '🛍️' },
      { pattern: /gym|workout|fitness|yoga|exercise|spa|wellness/i, category: 'fitness', icon: '💪' },
      { pattern: /outfit|style|fashion|clothes|wear/i, category: 'style', icon: '👗' },
    ];

    for (const { pattern, category, icon } of categoryPatterns) {
      if (pattern.test(text)) {
        return { category, icon, confidence: 0.7 };
      }
    }

    return {
      category: entry.category || 'notes',
      icon: CATEGORY_ICONS[entry.category] || '📝',
      confidence: 0.5
    };
  }
}

// Export singleton
export const journalWebEnrichmentService = new JournalWebEnrichmentService();
