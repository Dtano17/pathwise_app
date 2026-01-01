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
  venueType?: string; // nightclub, bar, restaurant, concert_venue, hotel, attraction, book, movie, exercise, etc.
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
  
  // Content-specific fields for Books
  author?: string;
  publisher?: string;
  publicationYear?: string;
  isbn?: string;
  purchaseLinks?: Array<{
    platform: string; // "Amazon", "Goodreads", "Barnes & Noble", etc.
    url: string;
  }>;
  
  // Content-specific fields for Movies/TV
  director?: string;
  cast?: string[];
  releaseYear?: string;
  runtime?: string;
  genre?: string;
  imdbRating?: number;
  streamingLinks?: Array<{
    platform: string; // "Netflix", "Amazon Prime", "Hulu", etc.
    url: string;
  }>;
  
  // Content-specific fields for Fitness
  muscleGroups?: string[];
  difficulty?: string;
  duration?: string;
  equipment?: string[];

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
  bar: 'restaurants',
  pub: 'restaurants',
  lounge: 'restaurants',
  nightclub: 'activities',
  wine_bar: 'restaurants',
  brewery: 'restaurants',
  bakery: 'restaurants',

  // Entertainment - Movies
  movie_theater: 'movies',
  cinema: 'movies',
  movie: 'movies',
  film: 'movies',
  
  // Entertainment - Music
  concert_venue: 'music',
  theater: 'activities',
  comedy_club: 'activities',
  arena: 'music',
  stadium: 'activities',
  music: 'music',
  artist: 'music',
  album: 'music',

  // Books & Reading
  book: 'books',
  biography: 'books',
  novel: 'books',
  memoir: 'books',
  textbook: 'books',
  bookstore: 'books',
  library: 'books',
  
  // Fitness & Exercise
  exercise: 'fitness',
  workout: 'fitness',
  yoga: 'fitness',
  gym: 'fitness',
  spa: 'fitness',
  yoga_studio: 'fitness',
  fitness_center: 'fitness',
  fitness: 'fitness',

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

  // Other
  school: 'books',
  office: 'notes',
  unknown: 'notes',
};

// Venue type identifiers - used by frontend to render appropriate Lucide icons
// The frontend's venueTypeIcons mapping uses these values to select the right icon
const VALID_VENUE_TYPES = [
  'restaurant', 'cafe', 'bar', 'nightclub', 'pub', 'lounge',
  'movie_theater', 'movie', 'film', 'concert_venue', 'music', 'artist', 'album', 'theater',
  'hotel', 'resort', 'museum', 'park', 'beach',
  'gym', 'exercise', 'workout', 'yoga', 'fitness',
  'book', 'biography', 'novel', 'memoir', 'textbook', 'bookstore',
  'spa', 'store', 'mall', 'boutique',
  'unknown'
];

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

      // CRITICAL: Detect content type FIRST before searching
      // This prevents "Leonardo da Vinci - Biography" from being searched as a museum
      const detectedContentType = this.detectContentType(entry.text);
      const effectiveCategory = detectedContentType || entry.category;
      
      console.log(`[JOURNAL_WEB_ENRICH] Content type detection: original="${entry.category}", detected="${detectedContentType || 'none'}", using="${effectiveCategory}"`);

      // Build search query with the corrected category
      const searchQuery = this.buildSearchQuery(venueName, city, effectiveCategory);

      // Search web for venue info
      const searchResponse = await this.searchWeb(searchQuery);

      if (!searchResponse.results || searchResponse.results.length === 0) {
        console.log(`[JOURNAL_WEB_ENRICH] No search results for ${venueName}`);
        return {
          entryId: entry.id,
          success: false,
          error: 'No web results found'
        };
      }

      // Parse and structure the results using the detected/corrected category
      const enrichedData = await this.parseSearchResults(
        searchResponse.results, 
        searchResponse.images, 
        venueName, 
        city, 
        effectiveCategory
      );

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

  // ==========================================================================
  // CONTENT TYPE DETECTION - CRITICAL for correct enrichment
  // ==========================================================================

  /**
   * Detect the actual content type from the entry text BEFORE searching.
   * This prevents misclassification like "Biography" being searched as a museum.
   * Returns the detected category or null if no strong signals found.
   */
  private detectContentType(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // BOOKS - Strong signals
    const bookSignals = [
      /\bbiography\b/i,
      /\bmemoir\b/i,
      /\bnovel\b/i,
      /\bauthor\b/i,
      /\bwritten by\b/i,
      /\bby\s+[A-Z][a-z]+\s+[A-Z][a-z]+/,  // "by John Smith"
      /\bbook\b/i,
      /\bread(?:ing)?\b/i,
      /\bpublished\b/i,
      /\bedition\b/i,
      /\bchapter\b/i,
      /\bpages?\b/i,
      /\bisbn\b/i,
      /\bbestseller\b/i,
      /\bbest-seller\b/i,
      /\btextbook\b/i,
      /\bguide\s+to\b/i,
      /\bself-help\b/i,
      /\bpaperback\b/i,
      /\bhardcover\b/i,
      /\baudiobook\b/i,
    ];
    
    // MOVIES/TV - Strong signals
    const movieSignals = [
      /\bwatch\b/i,
      /\bstream(?:ing)?\b/i,
      /\bmovie\b/i,
      /\bfilm\b/i,
      /\btheater(?:s)?\b/i,
      /\bcinema\b/i,
      /\bdirector\b/i,
      /\bdirected by\b/i,
      /\bstarring\b/i,
      /\bcast\b/i,
      /\bimdb\b/i,
      /\brotten tomatoes\b/i,
      /\bnetflix\b/i,
      /\bhulu\b/i,
      /\bdisney\+\b/i,
      /\bamazon prime\b/i,
      /\bhbo\b/i,
      /\brental\b/i,
      /\bseason\s+\d/i,
      /\bepisode\b/i,
      /\bseries\b/i,
      /\btv show\b/i,
      /\bdocumentary\b/i,
    ];
    
    // MUSIC - Strong signals
    const musicSignals = [
      /\balbum\b/i,
      /\bsong\b/i,
      /\btrack\b/i,
      /\bartist\b/i,
      /\bband\b/i,
      /\bconcert\b/i,
      /\bspotify\b/i,
      /\bapple music\b/i,
      /\blisten to\b/i,
      /\bplaylist\b/i,
      /\bmusician\b/i,
      /\bsinger\b/i,
    ];
    
    // FITNESS/EXERCISE - Strong signals
    const fitnessSignals = [
      /\bexercise\b/i,
      /\bworkout\b/i,
      /\byoga\b/i,
      /\bpose\b/i,
      /\breps?\b/i,
      /\bsets?\b/i,
      /\bmuscle\b/i,
      /\bstretch(?:ing)?\b/i,
      /\bcardio\b/i,
      /\bstrength\b/i,
      /\bweights?\b/i,
      /\bgym\b/i,
      /\bpilates\b/i,
      /\bhiit\b/i,
      /\bfitness\b/i,
      /\btraining\b/i,
    ];
    
    // Count matches for each type
    const bookMatches = bookSignals.filter(p => p.test(text)).length;
    const movieMatches = movieSignals.filter(p => p.test(text)).length;
    const musicMatches = musicSignals.filter(p => p.test(text)).length;
    const fitnessMatches = fitnessSignals.filter(p => p.test(text)).length;
    
    // Need at least 1 signal to make a detection
    const maxMatches = Math.max(bookMatches, movieMatches, musicMatches, fitnessMatches);
    
    if (maxMatches === 0) {
      return null;
    }
    
    // Return the VENUE TYPE (not category) with most matches
    // These values must match the venueType values used in VENUE_TYPE_TO_CATEGORY
    if (bookMatches === maxMatches && bookMatches >= 1) {
      return 'book'; // venueType, not category
    }
    if (movieMatches === maxMatches && movieMatches >= 1) {
      return 'movie'; // venueType, not category
    }
    if (musicMatches === maxMatches && musicMatches >= 1) {
      return 'music'; // venueType
    }
    if (fitnessMatches === maxMatches && fitnessMatches >= 1) {
      return 'exercise'; // venueType
    }
    
    return null;
  }

  private buildSearchQuery(venueName: string, city?: string, category?: string): string {
    let query = venueName;

    // Category-specific search strategies for better image/info retrieval
    // Supports both venueType values (book, movie) and category names (books, movies)
    const categorySearchConfig: Record<string, { suffix: string; imageHint: string }> = {
      // VenueType values (from detectContentType)
      book: { suffix: 'book cover author ISBN', imageHint: 'cover' },
      movie: { suffix: 'movie film IMDB poster', imageHint: 'poster' },
      music: { suffix: 'artist band album concert', imageHint: 'artist' },
      exercise: { suffix: 'exercise workout pose form', imageHint: 'exercise' },
      // Category names
      movies: { suffix: 'movie film IMDB poster', imageHint: 'poster' },
      'Movies & TV Shows': { suffix: 'movie film IMDB poster', imageHint: 'poster' },
      books: { suffix: 'book cover author ISBN', imageHint: 'cover' },
      'Books & Reading': { suffix: 'book cover author ISBN', imageHint: 'cover' },
      fitness: { suffix: 'exercise workout pose form', imageHint: 'exercise' },
      wellness: { suffix: 'wellness spa health', imageHint: 'wellness' },
      'Music & Artists': { suffix: 'artist band album concert', imageHint: 'artist' },
      restaurants: { suffix: 'restaurant menu photos', imageHint: 'food venue' },
      'Restaurants & Food': { suffix: 'restaurant menu photos', imageHint: 'food venue' },
      bars: { suffix: 'bar cocktail nightlife', imageHint: 'bar venue' },
      travel: { suffix: 'destination hotel attraction', imageHint: 'travel' },
      'Travel & Places': { suffix: 'destination hotel attraction photos', imageHint: 'travel' },
      hotels: { suffix: 'hotel resort accommodation photos', imageHint: 'hotel' },
      activities: { suffix: 'activity event venue', imageHint: 'activity' },
      entertainment: { suffix: 'entertainment show event', imageHint: 'entertainment' },
      hobbies: { suffix: 'hobby activity', imageHint: 'hobby' },
      'Hobbies & Interests': { suffix: 'hobby activity', imageHint: 'hobby' },
    };

    const config = category ? categorySearchConfig[category] : null;
    
    if (config) {
      query += ` ${config.suffix}`;
    } else if (city) {
      query += ` ${city}`;
    }

    // Add location for venue-based categories
    if (city && ['restaurants', 'bars', 'hotels', 'activities', 'entertainment'].includes(category || '')) {
      query += ` ${city}`;
    }

    return query;
  }

  // Get the image hint for a category to filter results
  private getCategoryImageHint(category?: string): string {
    const hints: Record<string, string> = {
      movies: 'poster',
      'Movies & TV Shows': 'poster',
      books: 'cover',
      'Books & Reading': 'cover',
      fitness: 'exercise',
      music: 'album artist',
      'Music & Artists': 'album artist',
    };
    return hints[category || ''] || 'venue';
  }

  // ==========================================================================
  // WEB SEARCH
  // ==========================================================================

  private async searchWeb(query: string): Promise<{ results: any[]; images: string[] }> {
    if (!this.tavilyClient) {
      console.warn('[JOURNAL_WEB_ENRICH] Tavily client not initialized');
      return { results: [], images: [] };
    }

    try {
      const response = await this.tavilyClient.search(query, {
        searchDepth: 'basic',
        maxResults: 5,
        includeImages: true,
        includeAnswer: true,
      });

      // CRITICAL FIX: Tavily returns images at response.images, NOT in individual results
      // Images can be either strings or objects with url property
      const rawImages = response.images || [];
      const images: string[] = rawImages.map((img: any) => {
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object' && img.url) return img.url;
        return '';
      }).filter((url: string) => url.length > 0);
      
      console.log(`[JOURNAL_WEB_ENRICH] Tavily returned ${images.length} images for query: "${query.substring(0, 50)}..."`);
      
      return { 
        results: response.results || [],
        images: images
      };
    } catch (error) {
      console.error('[JOURNAL_WEB_ENRICH] Tavily search failed:', error);
      return { results: [], images: [] };
    }
  }

  // ==========================================================================
  // RESULT PARSING
  // ==========================================================================

  private async parseSearchResults(
    results: any[],
    images: string[],
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

    // Use images from Tavily response (passed as parameter)
    // Filter out logos and icons
    const filteredImages = images.filter((url: string) => 
      url && !url.includes('logo') && !url.includes('icon') && !url.includes('favicon')
    ).slice(0, 5);

    console.log(`[JOURNAL_WEB_ENRICH] Processing ${filteredImages.length} filtered images for ${venueName}`);

    if (filteredImages.length > 0) {
      enrichedData.primaryImageUrl = filteredImages[0];
      enrichedData.mediaUrls = filteredImages.map((url: string) => ({
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

    // If category is a venueType (from detectContentType), set it as the venueType if AI didn't return one
    const VENUE_TYPES = ['book', 'movie', 'music', 'exercise', 'restaurant', 'hotel', 'museum', 'park', 'bar', 'cafe'];
    if (!enrichedData.venueType && category && VENUE_TYPES.includes(category)) {
      enrichedData.venueType = category;
    }
    
    // Set suggested category based on venue type
    if (enrichedData.venueType) {
      enrichedData.suggestedCategory = VENUE_TYPE_TO_CATEGORY[enrichedData.venueType] || category || 'notes';
      enrichedData.categoryConfidence = 0.85;
    }

    // Generate purchase links for books if not provided by AI
    // Check for both venueType 'book' and category 'books'/'Books & Reading'
    const isBook = enrichedData.venueType === 'book' || category === 'book' || category === 'books' || category === 'Books & Reading';
    if (isBook && (!enrichedData.purchaseLinks || enrichedData.purchaseLinks.length === 0)) {
      const searchTerm = encodeURIComponent(venueName + (enrichedData.author ? ` ${enrichedData.author}` : ''));
      enrichedData.purchaseLinks = [
        { platform: 'Amazon', url: `https://www.amazon.com/s?k=${searchTerm}&i=stripbooks` },
        { platform: 'Goodreads', url: `https://www.goodreads.com/search?q=${searchTerm}` },
      ];
    }
    
    // Generate streaming search links for movies if not provided by AI
    // Check for both venueType 'movie' and category 'movies'/'Movies & TV Shows'
    const isMovie = enrichedData.venueType === 'movie' || category === 'movie' || category === 'movies' || category === 'Movies & TV Shows';
    if (isMovie && (!enrichedData.streamingLinks || enrichedData.streamingLinks.length === 0)) {
      const searchTerm = encodeURIComponent(venueName);
      enrichedData.streamingLinks = [
        { platform: 'JustWatch', url: `https://www.justwatch.com/us/search?q=${searchTerm}` },
        { platform: 'Google', url: `https://www.google.com/search?q=${searchTerm}+watch+online` },
      ];
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

    // Build category-specific extraction prompt with better type hints
    // Supports both venueType values (book, movie) and category names (books, movies)
    const categoryPrompts: Record<string, string> = {
      // VenueType values
      book: `This is a BOOK. Extract: title, author name, genre, publication year, rating (1-5 stars), publisher, where to buy.`,
      movie: `This is a MOVIE/FILM. Extract: title, year, director, genre, IMDB rating (0-10), runtime, streaming platforms.`,
      music: `This is MUSIC/ARTIST. Extract: artist/band name, genre, popular albums, streaming platforms.`,
      exercise: `This is an EXERCISE/WORKOUT. Extract: exercise name, muscle groups worked, difficulty level, equipment needed, duration.`,
      // Category names
      movies: `This is a MOVIE/FILM. Extract: title, year, director, genre, IMDB rating (0-10), runtime, streaming platforms.`,
      'Movies & TV Shows': `This is a MOVIE/TV SHOW. Extract: title, year, director, genre, IMDB rating (0-10), runtime, streaming platforms.`,
      books: `This is a BOOK. Extract: title, author name, genre, publication year, rating (1-5 stars), publisher, where to buy.`,
      'Books & Reading': `This is a BOOK. Extract: title, author name, genre, publication year, rating (1-5 stars), publisher, where to buy.`,
      fitness: `This is an EXERCISE/WORKOUT. Extract: exercise name, muscle groups worked, difficulty level, equipment needed, duration.`,
      'Music & Artists': `This is MUSIC/ARTIST. Extract: artist/band name, genre, popular albums, streaming platforms.`,
    };
    
    const categoryPrompt = category ? categoryPrompts[category] : null;
    const promptContent = categoryPrompt 
      ? `${categoryPrompt}\n\nContent about "${venueName}":\n${content.substring(0, 2500)}`
      : `Extract structured information from this web content about "${venueName}"${city ? ` in ${city}` : ''}.\n\nContent:\n${content.substring(0, 2500)}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `${promptContent}

IMPORTANT: Correctly identify the content type. If it's about a book/biography/novel, venueType MUST be "book". If it's about a movie/film, venueType MUST be "movie". Do NOT confuse books about people with places named after them.

Return JSON with these fields (omit if not found):
{
  "venueType": "book|movie|music|exercise|restaurant|bar|hotel|museum|park|gym|spa|other",
  "venueDescription": "brief description (1-2 sentences)",
  "priceRange": "$|$$|$$$|$$$$",
  "rating": 0-5 number (convert IMDB 0-10 to 0-5 scale),
  "reviewCount": number,
  
  // For BOOKS only:
  "author": "author name",
  "publisher": "publisher name",
  "publicationYear": "year",
  "purchaseLinks": [{"platform": "Amazon", "url": "..."}, {"platform": "Goodreads", "url": "..."}],
  
  // For MOVIES only:
  "director": "director name",
  "releaseYear": "year",
  "runtime": "duration",
  "genre": "genre",
  "streamingLinks": [{"platform": "Netflix", "url": "..."}, {"platform": "Amazon Prime", "url": "..."}],
  
  // For FITNESS only:
  "muscleGroups": ["chest", "triceps"],
  "difficulty": "beginner|intermediate|advanced",
  "duration": "30 mins",
  "equipment": ["dumbbells", "bench"],
  
  // For VENUES (restaurants, hotels, etc.):
  "address": "full address",
  "city": "city",
  "businessHours": "hours",
  "phone": "phone",
  "website": "main website URL"
}

Return only valid JSON, no explanation.`
      }]
    });

    const textContent = response.content[0];
    if (textContent.type !== 'text') return {};

    try {
      // Try multiple extraction approaches for robustness
      let jsonStr = textContent.text.trim();
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json?\s*/gi, '').replace(/```\s*/g, '');
      
      // Try to extract just the JSON object with balanced braces
      const startIdx = jsonStr.indexOf('{');
      if (startIdx === -1) return {};
      
      let braceCount = 0;
      let endIdx = startIdx;
      for (let i = startIdx; i < jsonStr.length; i++) {
        if (jsonStr[i] === '{') braceCount++;
        else if (jsonStr[i] === '}') braceCount--;
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
      
      jsonStr = jsonStr.substring(startIdx, endIdx);
      if (!jsonStr) return {};

      const parsed = JSON.parse(jsonStr);

      const result: Partial<WebEnrichedData> = {
        venueType: parsed.venueType,
        venueDescription: parsed.venueDescription,
        priceRange: parsed.priceRange,
        rating: parsed.rating,
        reviewCount: parsed.reviewCount,
        website: parsed.website,
      };
      
      // Location fields (for venues)
      if (parsed.address || parsed.city) {
        result.location = {
          address: parsed.address,
          city: parsed.city || city,
          neighborhood: parsed.neighborhood,
        };
      }
      
      // Venue-specific fields
      if (parsed.businessHours) result.businessHours = parsed.businessHours;
      if (parsed.phone) result.phone = parsed.phone;
      if (parsed.reservationUrl) result.reservationUrl = parsed.reservationUrl;
      
      // BOOK fields
      if (parsed.author) result.author = parsed.author;
      if (parsed.publisher) result.publisher = parsed.publisher;
      if (parsed.publicationYear) result.publicationYear = parsed.publicationYear;
      if (parsed.purchaseLinks && Array.isArray(parsed.purchaseLinks)) {
        result.purchaseLinks = parsed.purchaseLinks;
      }
      
      // MOVIE fields
      if (parsed.director) result.director = parsed.director;
      if (parsed.releaseYear) result.releaseYear = parsed.releaseYear;
      if (parsed.runtime) result.runtime = parsed.runtime;
      if (parsed.genre) result.genre = parsed.genre;
      if (parsed.streamingLinks && Array.isArray(parsed.streamingLinks)) {
        result.streamingLinks = parsed.streamingLinks;
      }
      
      // FITNESS fields
      if (parsed.muscleGroups && Array.isArray(parsed.muscleGroups)) {
        result.muscleGroups = parsed.muscleGroups;
      }
      if (parsed.difficulty) result.difficulty = parsed.difficulty;
      if (parsed.duration) result.duration = parsed.duration;
      if (parsed.equipment && Array.isArray(parsed.equipment)) {
        result.equipment = parsed.equipment;
      }
      
      console.log(`[JOURNAL_WEB_ENRICH] AI extracted venueType: ${result.venueType}, author: ${result.author}, director: ${result.director}`);

      return result;
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

  // Returns the venueType identifier for the frontend to render the appropriate icon
  // The frontend uses this with its venueTypeIcons mapping to display Lucide icons
  getVenueTypeIdentifier(venueType?: string): string {
    return venueType || 'unknown';
  }

  // Returns the category identifier for the frontend to render the appropriate icon
  getCategoryIdentifier(category: string): string {
    return category || 'notes';
  }

  mapVenueTypeToCategory(venueType: string): string {
    return VENUE_TYPE_TO_CATEGORY[venueType] || 'notes';
  }

  // ==========================================================================
  // CATEGORY SUGGESTION
  // ==========================================================================

  getSuggestedCategoryForEntry(entry: JournalEntryForEnrichment): {
    category: string;
    venueType: string;
    confidence: number;
  } {
    // If we have web-enriched venue type, use that
    if (entry.existingEnrichment?.venueType) {
      const category = VENUE_TYPE_TO_CATEGORY[entry.existingEnrichment.venueType] || entry.category;
      return {
        category,
        venueType: entry.existingEnrichment.venueType,
        confidence: entry.existingEnrichment.categoryConfidence || 0.85
      };
    }

    // Fall back to text analysis
    const text = entry.text.toLowerCase();

    // Map of patterns to category and venueType (frontend renders icons based on venueType)
    const categoryPatterns: Array<{ pattern: RegExp; category: string; venueType: string }> = [
      { pattern: /restaurant|cafe|diner|bistro|eatery|food|cuisine|dish|meal/i, category: 'restaurants', venueType: 'restaurant' },
      { pattern: /bar|pub|lounge|cocktail|beer|wine|drinks?/i, category: 'restaurants', venueType: 'bar' },
      { pattern: /nightclub|club|dancing|dj|party venue/i, category: 'activities', venueType: 'nightclub' },
      { pattern: /movie|cinema|film|theater|screening/i, category: 'movies', venueType: 'movie' },
      { pattern: /concert|music|live show|band|artist|album/i, category: 'music', venueType: 'music' },
      { pattern: /hotel|resort|airbnb|hostel|stay|vacation|trip|travel|visit/i, category: 'travel', venueType: 'hotel' },
      { pattern: /museum|gallery|exhibit|art|attraction/i, category: 'travel', venueType: 'museum' },
      { pattern: /book|read|author|novel|library/i, category: 'books', venueType: 'book' },
      { pattern: /shop|store|buy|purchase|mall|boutique/i, category: 'shopping', venueType: 'store' },
      { pattern: /gym|workout|fitness|yoga|exercise|spa|wellness/i, category: 'fitness', venueType: 'exercise' },
      { pattern: /outfit|style|fashion|clothes|wear/i, category: 'style', venueType: 'boutique' },
    ];

    for (const { pattern, category, venueType } of categoryPatterns) {
      if (pattern.test(text)) {
        return { category, venueType, confidence: 0.7 };
      }
    }

    return {
      category: entry.category || 'notes',
      venueType: 'unknown',
      confidence: 0.5
    };
  }
}

// Export singleton
export const journalWebEnrichmentService = new JournalWebEnrichmentService();
