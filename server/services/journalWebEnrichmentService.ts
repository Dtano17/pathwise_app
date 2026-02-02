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

import { tavilySearch, isTavilyConfigured } from './tavilyProvider';
import Anthropic from '@anthropic-ai/sdk';
import { tmdbService, TMDBSearchResult } from './tmdbService';
import { spotifyEnrichmentService } from './spotifyEnrichmentService';
import { generateSmartImageQueryCached } from './journalAIQueryService';
import {
  extractContext,
  ExtractedContext,
  validateEnrichment,
  getDynamicThreshold,
} from './dynamicCategorizationService';
import { storage } from '../storage';
import {
  searchPlaceWithPhotos,
  isGooglePlacesConfigured,
  priceLevelToSymbol,
} from './googlePlacesService';

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

  // Content-specific fields for Travel (hotels, museums, attractions)
  highlights?: string[]; // Key features like "ocean view", "rooftop pool"
  amenities?: string[]; // Hotel amenities like "WiFi", "parking"

  // Content-specific fields for Shopping (stores, boutiques)
  productCategories?: string[]; // What they sell: "electronics", "clothing"

  // Metadata
  enrichedAt: string;
  enrichmentSource: 'tavily' | 'claude' | 'google' | 'manual' | 'tmdb' | 'spotify' | 'google_books' | 'placeholder';
  rawSearchResults?: any;

  // Placeholder flag for unreleased content
  isComingSoon?: boolean;
}

export interface JournalEntryForEnrichment {
  id: string;
  text: string;
  category: string;
  venueName?: string;
  location?: { city?: string; country?: string };
  existingEnrichment?: WebEnrichedData;
  // NEW: Context from plan extraction for smarter enrichment
  creator?: string;  // Author/director/artist
  enrichmentContext?: {
    theme?: string;           // e.g., "top nonfiction 2025", "best brunch LA"
    contentType?: string;     // e.g., "movie", "book", "restaurant"
    sourceDescription?: string; // Original source context
  };
}

/**
 * Universal Batch Context - AI-inferred understanding of a collection
 * Works across ALL categories: restaurants, books, music, fitness, movies, events, etc.
 *
 * Example: ["Nobu", "Per Se", "Eleven Madison Park"] →
 *   { contentType: "restaurant", collectionDescription: "high-end NYC fine dining, Michelin starred",
 *     inferredCuisine: "upscale American/Japanese fusion", inferredPriceRange: "$$$$" }
 */
export interface UniversalBatchContext {
  // What type of content is this collection?
  contentType: 'movie' | 'tv_show' | 'book' | 'music' | 'restaurant' | 'bar' | 'fitness' | 'travel' | 'event' | 'product' | 'mixed' | 'unknown';

  // AI-generated description of what the collection is
  collectionDescription: string | null;

  // Common characteristics inferred from the batch
  inferredGenre?: string;        // e.g., "horror movies", "self-help books", "electronic music"
  inferredEra?: string;          // e.g., "2025-2026 releases", "80s classics", "contemporary"
  inferredRegion?: string;       // e.g., "US", "Korea", "NYC", "European"
  inferredStyle?: string;        // e.g., "minimalist", "luxury", "casual", "high-intensity"

  // Category-specific inferred attributes
  inferredCuisine?: string;      // For restaurants: "Italian", "Japanese fusion", etc.
  inferredPriceRange?: '$' | '$$' | '$$$' | '$$$$';  // For restaurants, venues
  inferredDifficulty?: string;   // For fitness: "beginner", "advanced"
  inferredMuscleGroups?: string[];  // For fitness: ["chest", "back", "legs"]
  inferredArtist?: string;       // For music: common artist/band
  inferredAuthor?: string;       // For books: common author

  // Temporal context
  isUpcoming?: boolean;          // Are these future/upcoming items?
  isClassic?: boolean;           // Are these classic/historical items?
  yearRange?: { min: number; max: number } | null;

  // Confidence in the inference (0-1)
  confidence: number;

  // Raw titles analyzed
  analyzedTitles: string[];
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
  private anthropic: Anthropic | null = null;
  private cache: Map<string, { data: WebEnrichedData; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours

  constructor() {
    // Tavily client is now managed by tavilyProvider.ts with automatic key rotation
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  // Current batch context for collective inference across all categories
  private currentBatchContext: UniversalBatchContext | null = null;

  // ==========================================================================
  // UNIVERSAL BATCH CONTEXT INFERENCE
  // Uses AI to understand what a collection of items IS before searching
  // ==========================================================================

  /**
   * AI-powered batch context inference for ANY category type.
   *
   * Step 1: Look at collection like ["Nobu", "Per Se", "Eleven Madison Park"]
   * Step 2: AI infers "These are high-end NYC fine dining restaurants, Michelin starred"
   * Step 3: Use that context to constrain searches (e.g., search "Eleven Madison Park" as NYC fine dining)
   *
   * This prevents mismatches where generic names get wrong results.
   */
  async inferUniversalBatchContext(entries: JournalEntryForEnrichment[]): Promise<UniversalBatchContext | null> {
    if (!this.anthropic || entries.length < 2) {
      console.log(`[BATCH_CONTEXT] Skipping batch inference: ${!this.anthropic ? 'no API' : 'too few entries'}`);
      return null;
    }

    // Extract titles/names from entries
    const titles: string[] = [];
    for (const entry of entries.slice(0, 15)) { // Limit for performance
      const extracted = this.extractVenueInfo(entry.text);
      if (extracted.venueName) {
        titles.push(extracted.venueName);
      } else {
        // Fallback: use first 50 chars of text
        titles.push(entry.text.substring(0, 50).trim());
      }
    }

    if (titles.length < 2) {
      console.log(`[BATCH_CONTEXT] Not enough valid titles extracted`);
      return null;
    }

    console.log(`[BATCH_CONTEXT] Analyzing ${titles.length} items with AI: ${titles.slice(0, 5).join(', ')}...`);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Analyze this list of items and determine what they have in common.

Items:
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Your task:
1. Identify WHAT type of content this is (movies, TV shows, books, music/artists, restaurants, bars/clubs, fitness/exercises, travel destinations, events, products)
2. Identify common characteristics (genre, era, style, region, cuisine type, difficulty level, etc.)
3. Determine if these are upcoming/new releases or classics

Respond ONLY with valid JSON:
{
  "contentType": "movie" | "tv_show" | "book" | "music" | "restaurant" | "bar" | "fitness" | "travel" | "event" | "product" | "mixed" | "unknown",
  "collectionDescription": "brief description of what this collection is (e.g., '2025-2026 upcoming Hollywood blockbusters', 'NYC Michelin-starred restaurants', 'contemporary female pop artists', 'compound strength exercises')",
  "inferredGenre": "genre/category if applicable",
  "inferredEra": "time period (e.g., '2025-2026', '80s classics', 'contemporary')",
  "inferredRegion": "geographic region if applicable (e.g., 'US', 'Korea', 'NYC', 'European')",
  "inferredStyle": "style descriptor if applicable",
  "inferredCuisine": "for restaurants only",
  "inferredPriceRange": "$" | "$$" | "$$$" | "$$$$" (for restaurants/venues),
  "inferredDifficulty": "for fitness: beginner/intermediate/advanced",
  "inferredMuscleGroups": ["list", "of", "muscle", "groups"] (for fitness),
  "inferredArtist": "common artist/band for music",
  "inferredAuthor": "common author for books",
  "isUpcoming": true/false,
  "isClassic": true/false,
  "yearRange": { "min": 2025, "max": 2026 } | null,
  "confidence": 0.0-1.0
}`
        }]
      });

      const textContent = response.content[0];
      if (textContent.type !== 'text') {
        return null;
      }

      // Parse AI response
      const text = textContent.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`[BATCH_CONTEXT] AI did not return valid JSON`);
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const batchContext: UniversalBatchContext = {
        contentType: parsed.contentType || 'unknown',
        collectionDescription: parsed.collectionDescription || null,
        inferredGenre: parsed.inferredGenre,
        inferredEra: parsed.inferredEra,
        inferredRegion: parsed.inferredRegion,
        inferredStyle: parsed.inferredStyle,
        inferredCuisine: parsed.inferredCuisine,
        inferredPriceRange: parsed.inferredPriceRange,
        inferredDifficulty: parsed.inferredDifficulty,
        inferredMuscleGroups: parsed.inferredMuscleGroups,
        inferredArtist: parsed.inferredArtist,
        inferredAuthor: parsed.inferredAuthor,
        isUpcoming: parsed.isUpcoming || false,
        isClassic: parsed.isClassic || false,
        yearRange: parsed.yearRange || null,
        confidence: parsed.confidence || 0.5,
        analyzedTitles: titles
      };

      console.log(`[BATCH_CONTEXT] AI inference result:`, {
        contentType: batchContext.contentType,
        description: batchContext.collectionDescription,
        genre: batchContext.inferredGenre,
        era: batchContext.inferredEra,
        region: batchContext.inferredRegion,
        confidence: batchContext.confidence
      });

      // Store for use in individual enrichments
      this.currentBatchContext = batchContext;

      return batchContext;

    } catch (error) {
      console.error(`[BATCH_CONTEXT] AI inference failed:`, error);
      return null;
    }
  }

  /**
   * Get the current batch context (set during batch enrichment)
   */
  getBatchContext(): UniversalBatchContext | null {
    return this.currentBatchContext;
  }

  /**
   * Clear the current batch context (call after batch is complete)
   */
  clearBatchContext(): void {
    this.currentBatchContext = null;
  }

  /**
   * Manually set batch context for single entry refresh
   * This enables year-aware searching even for individual refreshes
   */
  setBatchContext(context: Partial<UniversalBatchContext>): void {
    this.currentBatchContext = {
      contentType: context.contentType || 'unknown',
      collectionDescription: context.collectionDescription || null,
      yearRange: context.yearRange || null,
      inferredRegion: context.inferredRegion || null,
      inferredPriceRange: context.inferredPriceRange || null,
      inferredCuisine: context.inferredCuisine || null,
      confidence: context.confidence || 0.5,
    };
  }

  // ==========================================================================
  // GOOGLE BOOKS API - For reliable book cover and metadata
  // ==========================================================================

  private async searchGoogleBooks(title: string, author?: string): Promise<{
    coverUrl?: string;
    author?: string;
    publisher?: string;
    publishedDate?: string;
    description?: string;
    infoLink?: string;
    isbn?: string;
  } | null> {
    try {
      // Build search query - include author if available for better results
      const query = author ? `${title}+inauthor:${author}` : title;
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3`;

      console.log(`[JOURNAL_WEB_ENRICH] Searching Google Books for: "${title}"${author ? ` by ${author}` : ''}`);

      const response = await fetch(url);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        // Find best match - prefer items with images
        const bookWithImage = data.items.find((item: any) => item.volumeInfo?.imageLinks?.thumbnail);
        const book = bookWithImage?.volumeInfo || data.items[0].volumeInfo;

        // Get the largest available cover image
        // Google Books provides: thumbnail (~128px), small (~200px), medium (~300px), large (~400px), extraLarge (~600px)
        const imageLinks = book.imageLinks || {};
        let coverUrl = imageLinks.extraLarge || imageLinks.large || imageLinks.medium || imageLinks.small || imageLinks.thumbnail;

        // Convert to HTTPS and optimize for higher resolution
        if (coverUrl) {
          coverUrl = coverUrl
            .replace('http:', 'https:')
            .replace('&edge=curl', '')  // Remove page curl effect
            .replace(/zoom=\d/, 'zoom=3')  // Request max zoom (zoom=3 gives ~600px)
            .replace(/&w=\d+/, '')  // Remove width constraint
            .replace(/&h=\d+/, '');  // Remove height constraint

          // If no zoom parameter, add it for larger images
          if (!coverUrl.includes('zoom=')) {
            coverUrl += '&zoom=3';
          }
        }

        const isbn = book.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier
                  || book.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier;

        console.log(`[JOURNAL_WEB_ENRICH] Google Books found: "${book.title}" with cover: ${!!coverUrl}`);

        return {
          coverUrl,
          author: book.authors?.[0],
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          description: book.description?.substring(0, 200),
          infoLink: book.infoLink,
          isbn
        };
      }

      console.log(`[JOURNAL_WEB_ENRICH] No books found in Google Books API`);
    } catch (error) {
      console.warn('[JOURNAL_WEB_ENRICH] Google Books API failed:', error);
    }
    return null;
  }

  // ==========================================================================
  // DYNAMIC CONTEXT-AWARE CATEGORY VALIDATOR
  // Uses AI to extract rich context and score matches - no hardcoded keywords
  // ==========================================================================

  /**
   * Validate and potentially correct the category using dynamic context extraction.
   * Returns the TMDB result if a movie/TV show is detected to avoid duplicate API calls.
   *
   * This replaces hardcoded keyword matching with AI-driven context analysis.
   * Now enhanced with batch context for better inference of ambiguous items.
   */
  private async validateAndCorrectCategory(
    text: string,
    currentCategory: string,
    venueName?: string
  ): Promise<{ category: string; confidence: number; tmdbResult?: TMDBSearchResult; context?: ExtractedContext }> {
    // Use AI to extract rich context from the input
    const inputForContext = venueName ? `${venueName} - ${text}` : text;
    const context = await extractContext(inputForContext);

    // =========================================================================
    // BATCH CONTEXT BOOST
    // If we have batch context, use it to boost confidence for matching types
    // =========================================================================
    const batchCtx = this.currentBatchContext;
    if (batchCtx && batchCtx.confidence > 0.6) {
      // Map batch content types to context entity types
      const batchToEntityType: Record<string, string> = {
        'movie': 'movie',
        'tv_show': 'tv_show',
        'book': 'book',
        'music': 'music',
        'restaurant': 'restaurant',
        'bar': 'bar_club',
        'fitness': 'fitness',
        'travel': 'travel',
        'event': 'event',
        'product': 'product'
      };

      const expectedEntityType = batchToEntityType[batchCtx.contentType];

      // If batch says these are movies and context is unsure, boost toward movie
      if (expectedEntityType && context.entityType === 'unknown') {
        console.log(`[CATEGORY_VALIDATOR] Batch context override: setting type to ${expectedEntityType} (batch confidence: ${batchCtx.confidence})`);
        (context as any).entityType = expectedEntityType;
        context.confidence = Math.max(context.confidence, 0.7);
      }

      // If batch and context agree, boost confidence
      if (expectedEntityType === context.entityType) {
        context.confidence = Math.min(1.0, context.confidence + 0.15);
        console.log(`[CATEGORY_VALIDATOR] Batch context agreement: boosted confidence to ${context.confidence}`);
      }
    }

    console.log(`[CATEGORY_VALIDATOR] Extracted context: type=${context.entityType}, name="${context.entityName}", year=${context.year || 'none'}, platform=${context.platform || 'none'}, confidence=${context.confidence}`);

    // Get dynamic threshold based on context (short names need stricter matching)
    const threshold = getDynamicThreshold(context);

    // Map entity type to category
    const ENTITY_TO_DISPLAY_CATEGORY: Record<string, string> = {
      'movie': 'Movies & TV Shows',
      'tv_show': 'Movies & TV Shows',
      'book': 'Books & Reading',
      'music': 'Music & Artists',
      'restaurant': 'Restaurants & Food',
      'bar_club': 'Bars & Nightlife',
      'event': 'Events & Activities',
      'fitness': 'Fitness & Exercise',
      'travel': 'Travel & Places',
      'product': 'Shopping',
      'unknown': currentCategory
    };

    // For movies/TV shows: Validate with TMDB using extracted context
    if ((context.entityType === 'movie' || context.entityType === 'tv_show') && tmdbService.isAvailable()) {
      const searchName = context.entityName;

      // Use the appropriate TMDB search based on entity type
      let tmdbResult: TMDBSearchResult | null = null;

      if (context.entityType === 'tv_show') {
        // For TV shows, search TV directly with year if available
        console.log(`[CATEGORY_VALIDATOR] TV show detected, searching TMDB TV: "${searchName}" (year: ${context.year || 'any'})`);
        tmdbResult = await tmdbService.searchTV(searchName, context.year || null);
      } else {
        // For movies, use searchMovie which handles year extraction
        console.log(`[CATEGORY_VALIDATOR] Movie detected, searching TMDB: "${searchName}" (year: ${context.year || 'any'})`);
        tmdbResult = await tmdbService.searchMovie(context.year ? `${searchName} ${context.year}` : searchName);
      }

      if (tmdbResult) {
        // Validate the TMDB result matches our context
        const validation = await validateEnrichment(context, {
          title: tmdbResult.title,
          year: tmdbResult.releaseYear ? parseInt(tmdbResult.releaseYear, 10) : undefined
        }, context.entityType === 'tv_show' ? 'tmdb_tv' : 'tmdb_movie');

        if (validation.isValid) {
          console.log(`[CATEGORY_VALIDATOR] TMDB match validated: "${tmdbResult.title}" (${tmdbResult.releaseYear}) - confidence: ${validation.confidence}`);
          return {
            category: 'Movies & TV Shows',
            confidence: validation.confidence,
            tmdbResult,
            context
          };
        } else {
          console.log(`[CATEGORY_VALIDATOR] TMDB match rejected: ${validation.reason}`);
        }
      }
    }

    // For books: Direct category assignment if confident
    if (context.entityType === 'book' && context.confidence >= 0.7) {
      console.log(`[CATEGORY_VALIDATOR] High-confidence book detection`);
      return { category: 'Books & Reading', confidence: context.confidence, context };
    }

    // For music: Direct category assignment if confident
    if (context.entityType === 'music' && context.confidence >= 0.7) {
      console.log(`[CATEGORY_VALIDATOR] High-confidence music detection`);
      return { category: 'Music & Artists', confidence: context.confidence, context };
    }

    // For restaurants: Use context signals
    if (context.entityType === 'restaurant' && context.confidence >= 0.6) {
      console.log(`[CATEGORY_VALIDATOR] Restaurant detected: cuisine=${context.cuisine || 'unknown'}, location=${context.location || 'unknown'}`);
      return { category: 'Restaurants & Food', confidence: context.confidence, context };
    }

    // For bars/clubs: Use context signals (venue type, location, "near me")
    if (context.entityType === 'bar_club' && context.confidence >= 0.6) {
      console.log(`[CATEGORY_VALIDATOR] Bar/Club detected: venueType=${context.venueType || 'unknown'}, location=${context.location || 'unknown'}, isNearMe=${context.isNearMe}`);
      return { category: 'Bars & Nightlife', confidence: context.confidence, context };
    }

    // For events: Use context signals (event type, date, location)
    if (context.entityType === 'event' && context.confidence >= 0.6) {
      console.log(`[CATEGORY_VALIDATOR] Event detected: eventType=${context.eventType || 'unknown'}, eventDate=${context.eventDate || 'unknown'}, location=${context.location || 'unknown'}`);
      return { category: 'Events & Activities', confidence: context.confidence, context };
    }

    // For fitness: Use context signals
    if (context.entityType === 'fitness' && context.confidence >= 0.6) {
      console.log(`[CATEGORY_VALIDATOR] Fitness detected: activity=${context.activityType || 'unknown'}, muscles=${context.muscleGroups?.join(', ') || 'unknown'}`);
      return { category: 'Fitness & Exercise', confidence: context.confidence, context };
    }

    // For travel: Use context signals
    if (context.entityType === 'travel' && context.confidence >= 0.6) {
      console.log(`[CATEGORY_VALIDATOR] Travel detected: location=${context.location || 'unknown'}`);
      return { category: 'Travel & Places', confidence: context.confidence, context };
    }

    // LOW CONFIDENCE: Use Tavily + AI for validation
    if (venueName && context.confidence < 0.6 && isTavilyConfigured()) {
      try {
        console.log(`[CATEGORY_VALIDATOR] Low confidence (${context.confidence}), using Tavily + AI for validation`);

        // Build a smarter search query using extracted context
        let searchQuery = context.entityName;
        if (context.year) searchQuery += ` ${context.year}`;
        if (context.cuisine) searchQuery += ` ${context.cuisine} restaurant`;
        if (context.location) searchQuery += ` ${context.location}`;

        const searchResponse = await tavilySearch(searchQuery, {
          maxResults: 3,
          searchDepth: 'basic'
        });

        if (searchResponse.results && searchResponse.results.length > 0) {
          const combinedContent = searchResponse.results
            .map(r => `${r.title}\n${r.content}`)
            .join('\n\n');

          if (this.anthropic) {
            const aiValidation = await this.anthropic.messages.create({
              model: 'claude-3-5-haiku-20241022',
              max_tokens: 200,
              messages: [{
                role: 'user',
                content: `Based on this web search result, what type of content is "${venueName}"?

${combinedContent}

Respond with ONLY a JSON object in this format:
{
  "category": "Movies & TV Shows" | "Books & Reading" | "Music & Artists" | "Restaurants & Food" | "Bars & Nightlife" | "Events & Activities" | "Travel & Places" | "Fitness & Exercise" | "Shopping" | "Notes",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`
              }]
            });

            const aiText = aiValidation.content[0].type === 'text' ? aiValidation.content[0].text : '';
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
              const aiResult = JSON.parse(jsonMatch[0]);
              console.log(`[CATEGORY_VALIDATOR] Tavily+AI validation: ${aiResult.category} (confidence: ${aiResult.confidence}) - ${aiResult.reasoning}`);
              return { category: aiResult.category, confidence: aiResult.confidence, context };
            }
          }
        }
      } catch (error) {
        console.warn(`[CATEGORY_VALIDATOR] Tavily+AI validation failed:`, error);
      }
    }

    // Return based on context if we have moderate confidence
    if (context.confidence >= 0.5) {
      const category = ENTITY_TO_DISPLAY_CATEGORY[context.entityType] || currentCategory;
      return { category, confidence: context.confidence, context };
    }

    return { category: currentCategory, confidence: 0.5, context };
  }

  // ==========================================================================
  // MAIN ENRICHMENT METHOD
  // ==========================================================================

  async enrichJournalEntry(entry: JournalEntryForEnrichment, forceRefresh: boolean = false): Promise<EnrichmentResult> {
    const startTime = Date.now();
    console.log(`[JOURNAL_WEB_ENRICH] Enriching entry ${entry.id}: "${entry.text.substring(0, 50)}..."${forceRefresh ? ' (FORCE REFRESH)' : ''}`);

    try {
      // FIRST: Extract venue name and location from text
      // This MUST happen BEFORE cache key generation to avoid cache collisions
      // when multiple entries have the same ID but different content
      const extractedInfo = this.extractVenueInfo(entry.text);
      
      // For movies, ALWAYS use extracted title (not the full venue name with parentheses)
      // This ensures "Watch Mission Impossible: The Final Reckoning (#1 ranked movie)" 
      // becomes just "Mission Impossible: The Final Reckoning" for TMDB search
      const contentType = this.detectContentType(entry.text);
      const isMovieContent = contentType === 'movie' || contentType === 'movies' ||
                             entry.category === 'custom-entertainment' || entry.category === 'Entertainment';
      
      const venueName = isMovieContent && extractedInfo.venueName 
        ? extractedInfo.venueName  // Use extracted clean title for movies
        : (entry.venueName || extractedInfo.venueName);
      const city = entry.location?.city || extractedInfo.city;
      
      // CRITICAL: Generate cache key using the EXTRACTED venue name (not entry.venueName)
      // This prevents cache collisions when entries share the same ID but have different content
      const cacheKey = this.generateCacheKeyFromVenue(venueName || '', city || '');
      
      // Check cache - but handle force refresh differently for verified vs unverified entries
      try {
        const dbCached = await storage.getJournalEnrichmentCache(cacheKey);

        if (dbCached) {
          // IMPORTANT: On force refresh, SKIP verified TMDB entries (don't waste time re-fetching)
          // Only refresh "Coming Soon" placeholders and unverified entries
          if (forceRefresh) {
            if (dbCached.verified && dbCached.enrichmentSource === 'tmdb' && !dbCached.isComingSoon) {
              // This is a verified TMDB entry - keep it, don't re-fetch
              const enrichedData = dbCached.enrichedData as WebEnrichedData;
              this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
              console.log(`[JOURNAL_WEB_ENRICH] SKIP refresh for verified TMDB entry: "${venueName}" (tmdbId: ${dbCached.tmdbId})`);
              return { entryId: entry.id, success: true, enrichedData };
            } else {
              // Unverified or Coming Soon - clear cache and re-enrich
              this.cache.delete(cacheKey);
              await storage.deleteJournalEnrichmentCache(cacheKey);
              console.log(`[JOURNAL_WEB_ENRICH] Clearing ${dbCached.isComingSoon ? 'Coming Soon placeholder' : 'unverified entry'} for refresh: "${venueName}"`);
            }
          } else {
            // Normal cache hit (no force refresh)
            const enrichedData = dbCached.enrichedData as WebEnrichedData;
            this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
            console.log(`[JOURNAL_WEB_ENRICH] DB cache hit for "${venueName}" (source: ${dbCached.enrichmentSource}, verified: ${dbCached.verified})`);
            return { entryId: entry.id, success: true, enrichedData };
          }
        }
      } catch (dbError) {
        console.warn(`[JOURNAL_WEB_ENRICH] DB cache lookup failed for "${venueName}":`, dbError);
        // Continue with fresh enrichment if DB lookup fails
      }

      // Also check in-memory cache if not force refresh
      if (!forceRefresh) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          console.log(`[JOURNAL_WEB_ENRICH] Memory cache hit for "${venueName}"`);
          return { entryId: entry.id, success: true, enrichedData: cached.data };
        }
      } else {
        // Clear in-memory cache on force refresh
        this.cache.delete(cacheKey);
      }

      if (!venueName) {
        console.log(`[JOURNAL_WEB_ENRICH] No venue name found in entry ${entry.id}`);
        return {
          entryId: entry.id,
          success: false,
          error: 'No venue name detected'
        };
      }

      // AI CATEGORY VALIDATION & CORRECTION
      // NOTE: validation.tmdbResult may contain TMDB data if movie was detected (avoids duplicate API call)
      const validation = await this.validateAndCorrectCategory(entry.text, entry.category, venueName);
      const effectiveCategory = validation.category;

      console.log(`[JOURNAL_WEB_ENRICH] Category validation: original="${entry.category}", validated="${effectiveCategory}", confidence=${validation.confidence}${validation.tmdbResult ? ' (TMDB cached)' : ''}`);

      // AI-POWERED API SELECTION
      // Let AI intelligently decide which enrichment API to use based on entry content
      console.log(`[JOURNAL_WEB_ENRICH] Using AI to determine best enrichment API for: "${venueName}"`);

      // Build enrichment context from entry data (passed from plan extraction Step 1)
      const enrichmentContext = entry.enrichmentContext ? {
        theme: entry.enrichmentContext.theme,
        contentType: entry.enrichmentContext.contentType,
        sourceDescription: entry.enrichmentContext.sourceDescription,
        creator: entry.creator,
        location: entry.location
      } : undefined;

      const aiRecommendation = await generateSmartImageQueryCached(
        entry.text,
        effectiveCategory || entry.category,
        venueName,
        enrichmentContext
      );

      console.log(`[JOURNAL_WEB_ENRICH] AI recommendation:`, {
        api: aiRecommendation.recommendedAPI,
        query: aiRecommendation.searchQuery,
        contentType: aiRecommendation.contentType,
        confidence: aiRecommendation.confidence,
        reasoning: aiRecommendation.reasoning
      });

      // Execute enrichment based on AI's recommendation
      if (aiRecommendation.recommendedAPI === 'tmdb' && tmdbService.isAvailable()) {
        // AI recommends TMDB (movies/TV)
        const searchTitle = aiRecommendation.extractedTitle || venueName;

        // Get batch context for year-aware searching
        // This prevents returning "The Secret Agent (1943)" when batch is "best 2024 movies"
        const batchCtx = this.getBatchContext();
        const yearHint = batchCtx?.yearRange?.min || null;

        if (yearHint) {
          console.log(`[JOURNAL_WEB_ENRICH] Using batch context year hint: ${yearHint} for "${searchTitle}"`);
        }

        let tmdbResult = validation.tmdbResult || await tmdbService.searchMovie(searchTitle, yearHint);

        // YEAR VALIDATION: If batch context has yearRange, validate the result year
        // Reject results that are way off from expected year (e.g., 1943 when expecting 2024)
        if (tmdbResult && batchCtx?.yearRange && tmdbResult.releaseYear) {
          const resultYear = parseInt(tmdbResult.releaseYear);
          const { min, max } = batchCtx.yearRange;
          // Allow 2-year tolerance (e.g., 2024 batch could match 2022-2026)
          if (resultYear < min - 2 || resultYear > max + 2) {
            console.log(`[JOURNAL_WEB_ENRICH] TMDB result year ${resultYear} outside expected range ${min}-${max}, rejecting match`);
            tmdbResult = null; // Reject this match, will trigger Coming Soon placeholder
          }
        }

        if (tmdbResult) {
          const enrichedData: WebEnrichedData = {
            venueVerified: true,
            venueType: tmdbResult.mediaType === 'tv' ? 'tv_show' : 'movie',
            venueName: tmdbResult.title,
            venueDescription: tmdbResult.overview?.substring(0, 300),
            primaryImageUrl: tmdbResult.posterUrl || undefined,
            mediaUrls: tmdbResult.posterUrl ? [{
              url: tmdbResult.posterUrl,
              type: 'image' as const,
              source: 'tmdb'
            }] : undefined,
            rating: tmdbResult.rating ? tmdbResult.rating / 2 : undefined,
            reviewCount: tmdbResult.ratingCount,
            director: tmdbResult.director,
            cast: tmdbResult.cast,
            releaseYear: tmdbResult.releaseYear,
            runtime: tmdbResult.runtime,
            genre: tmdbResult.genres?.join(', '),
            suggestedCategory: 'Movies & TV Shows',
            categoryConfidence: aiRecommendation.confidence,
            enrichedAt: new Date().toISOString(),
            enrichmentSource: 'tmdb',
            streamingLinks: [
              { platform: 'TMDB', url: `https://www.themoviedb.org/${tmdbResult.mediaType}/${tmdbResult.tmdbId}` },
              { platform: 'JustWatch', url: `https://www.justwatch.com/us/search?q=${encodeURIComponent(tmdbResult.title)}` },
              { platform: 'IMDB', url: `https://www.imdb.com/find?q=${encodeURIComponent(tmdbResult.title)}` }
            ]
          };

          // Save to both in-memory and persistent DB cache
          // Include tmdbId for deduplication and to skip re-fetching on future refreshes
          this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
          try {
            await storage.saveJournalEnrichmentCache({
              cacheKey,
              enrichedData: enrichedData as any,
              imageUrl: enrichedData.primaryImageUrl,
              verified: true, // TMDB is authoritative source
              enrichmentSource: 'tmdb',
              isComingSoon: false,
              tmdbId: tmdbResult.tmdbId,
              mediaType: tmdbResult.mediaType,
            });
            console.log(`[JOURNAL_WEB_ENRICH] Saved verified TMDB entry: "${tmdbResult.title}" (tmdbId: ${tmdbResult.tmdbId})`);
          } catch (saveError) {
            console.warn(`[JOURNAL_WEB_ENRICH] Failed to save TMDB result to DB cache:`, saveError);
          }

          const elapsed = Date.now() - startTime;
          console.log(`[JOURNAL_WEB_ENRICH] AI-recommended TMDB enrichment successful in ${elapsed}ms: "${tmdbResult.title}"`);

          return { entryId: entry.id, success: true, enrichedData };
        }

        // TMDB FAILED - Use "Coming Soon" placeholder for movies/TV instead of falling back to Tavily
        // This prevents wrong images from news articles (e.g., "Blade Runner 2099" showing "GMA3" image)
        console.log(`[JOURNAL_WEB_ENRICH] TMDB search failed for "${venueName}" - using Coming Soon placeholder`);

        const comingSoonData: WebEnrichedData = {
          venueVerified: false, // NOT verified - it's a placeholder
          venueType: 'movie',
          venueName: venueName,
          venueDescription: `"${venueName}" - Coming Soon. This title may be unreleased or not yet in our database.`,
          primaryImageUrl: '/images/coming-soon-movie.svg',
          mediaUrls: [{
            url: '/images/coming-soon-movie.svg',
            type: 'image' as const,
            source: 'placeholder'
          }],
          suggestedCategory: 'Movies & TV Shows',
          categoryConfidence: 0.5,
          enrichedAt: new Date().toISOString(),
          enrichmentSource: 'placeholder',
          isComingSoon: true,
          streamingLinks: [
            { platform: 'JustWatch', url: `https://www.justwatch.com/us/search?q=${encodeURIComponent(venueName)}` },
            { platform: 'IMDB', url: `https://www.imdb.com/find?q=${encodeURIComponent(venueName)}` }
          ]
        };

        // Save Coming Soon placeholder to both caches
        // Note: These will be refreshed on next force refresh since verified=false and isComingSoon=true
        this.cache.set(cacheKey, { data: comingSoonData, timestamp: Date.now() });
        try {
          await storage.saveJournalEnrichmentCache({
            cacheKey,
            enrichedData: comingSoonData as any,
            imageUrl: comingSoonData.primaryImageUrl,
            verified: false, // NOT verified - will be refreshed on next force refresh
            enrichmentSource: 'placeholder',
            isComingSoon: true, // Flag to indicate this needs re-enrichment
            mediaType: 'movie',
          });
        } catch (saveError) {
          console.warn(`[JOURNAL_WEB_ENRICH] Failed to save Coming Soon placeholder to DB cache:`, saveError);
        }

        const elapsed = Date.now() - startTime;
        console.log(`[JOURNAL_WEB_ENRICH] Using Coming Soon placeholder for "${venueName}" in ${elapsed}ms`);

        return { entryId: entry.id, success: true, enrichedData: comingSoonData };
      }

      else if (aiRecommendation.recommendedAPI === 'google_books') {
        // AI recommends Google Books
        const searchTitle = aiRecommendation.extractedTitle || venueName;
        const extractedAuthor = aiRecommendation.extractedDetails || (extractedInfo as any).author;
        const googleBooksResult = await this.searchGoogleBooks(searchTitle, extractedAuthor);

        if (googleBooksResult) {
          const enrichedData: WebEnrichedData = {
            venueVerified: true,
            venueType: 'book',
            venueName: searchTitle,
            venueDescription: googleBooksResult.description,
            primaryImageUrl: googleBooksResult.coverUrl,
            author: googleBooksResult.author,
            publisher: googleBooksResult.publisher,
            publicationYear: googleBooksResult.publishedDate?.substring(0, 4),
            suggestedCategory: 'Books & Reading',
            categoryConfidence: aiRecommendation.confidence,
            enrichedAt: new Date().toISOString(),
            enrichmentSource: 'google',
            purchaseLinks: googleBooksResult.isbn ? [
              { platform: 'Amazon', url: `https://www.amazon.com/s?k=${googleBooksResult.isbn}&i=stripbooks` },
              { platform: 'Goodreads', url: `https://www.goodreads.com/search?q=${googleBooksResult.isbn}` },
              { platform: 'Google Books', url: googleBooksResult.infoLink || `https://books.google.com/books?isbn=${googleBooksResult.isbn}` }
            ] : [
              { platform: 'Amazon', url: `https://www.amazon.com/s?k=${encodeURIComponent(searchTitle + (googleBooksResult.author ? ' ' + googleBooksResult.author : ''))}&i=stripbooks` },
              { platform: 'Goodreads', url: `https://www.goodreads.com/search?q=${encodeURIComponent(searchTitle)}` }
            ]
          };

          // Save to both in-memory and persistent DB cache
          this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
          try {
            await storage.saveJournalEnrichmentCache({
              cacheKey,
              enrichedData: enrichedData as any,
              imageUrl: enrichedData.primaryImageUrl,
              verified: enrichedData.venueVerified,
              enrichmentSource: 'google_books',
              isComingSoon: false,
            });
          } catch (saveError) {
            console.warn(`[JOURNAL_WEB_ENRICH] Failed to save Google Books result to DB cache:`, saveError);
          }

          const elapsed = Date.now() - startTime;
          console.log(`[JOURNAL_WEB_ENRICH] AI-recommended Google Books enrichment successful in ${elapsed}ms`);

          return { entryId: entry.id, success: true, enrichedData };
        }
        console.log(`[JOURNAL_WEB_ENRICH] Google Books search failed, falling back to Tavily`);
      }

      else if (aiRecommendation.recommendedAPI === 'spotify') {
        // AI recommends Spotify
        const spotifyAvailable = await spotifyEnrichmentService.isAvailable();
        if (spotifyAvailable) {
          const searchTitle = aiRecommendation.extractedTitle || venueName;
          const spotifyResult = await spotifyEnrichmentService.searchMusic(searchTitle);

          if (spotifyResult) {
            const enrichedData: WebEnrichedData = {
              venueVerified: true,
              venueType: spotifyResult.type === 'artist' ? 'artist' : 'music',
              venueName: spotifyResult.name,
              venueDescription: spotifyResult.albumName
                ? `${spotifyResult.type === 'track' ? 'Track' : 'Album'} by ${spotifyResult.artistName || 'Unknown Artist'}`
                : `Artist on Spotify`,
              primaryImageUrl: spotifyResult.imageUrl || undefined,
              mediaUrls: spotifyResult.imageUrl ? [{
                url: spotifyResult.imageUrl,
                type: 'image' as const,
                source: 'spotify'
              }] : undefined,
              website: spotifyResult.spotifyUrl,
              suggestedCategory: 'music',
              categoryConfidence: aiRecommendation.confidence,
              enrichedAt: new Date().toISOString(),
              enrichmentSource: 'spotify',
              streamingLinks: [
                { platform: 'Spotify', url: spotifyResult.spotifyUrl },
                { platform: 'Apple Music', url: `https://music.apple.com/search?term=${encodeURIComponent(spotifyResult.name)}` }
              ]
            };

            // Save to both in-memory and persistent DB cache
            this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
            try {
              await storage.saveJournalEnrichmentCache({
                cacheKey,
                enrichedData: enrichedData as any,
                imageUrl: enrichedData.primaryImageUrl,
                verified: enrichedData.venueVerified,
                enrichmentSource: 'spotify',
                isComingSoon: false,
              });
            } catch (saveError) {
              console.warn(`[JOURNAL_WEB_ENRICH] Failed to save Spotify result to DB cache:`, saveError);
            }

            const elapsed = Date.now() - startTime;
            console.log(`[JOURNAL_WEB_ENRICH] AI-recommended Spotify enrichment successful in ${elapsed}ms: "${spotifyResult.name}"`);

            return { entryId: entry.id, success: true, enrichedData };
          }
        }
        console.log(`[JOURNAL_WEB_ENRICH] Spotify search failed or unavailable, falling back to Tavily`);
      }

      // ========================================================================
      // GOOGLE PLACES: For restaurants, bars, cafes - accurate venue photos
      // ========================================================================
      else if (aiRecommendation.recommendedAPI === 'google_places' ||
               (effectiveCategory.toLowerCase().includes('restaurant') ||
                effectiveCategory.toLowerCase().includes('food') ||
                effectiveCategory.toLowerCase().includes('bar') ||
                effectiveCategory.toLowerCase().includes('cafe'))) {

        if (isGooglePlacesConfigured()) {
          console.log(`[JOURNAL_WEB_ENRICH] Using Google Places for restaurant/venue: "${venueName}"`);

          const searchTitle = aiRecommendation.extractedTitle || venueName;
          // Add location context if available
          const locationContext = city || (extractedInfo as any).city || (extractedInfo as any).location;
          const searchQuery = locationContext ? `${searchTitle} ${locationContext}` : searchTitle;

          const placeResult = await searchPlaceWithPhotos(searchQuery, {
            type: effectiveCategory.toLowerCase().includes('bar') ? 'bar' :
                  effectiveCategory.toLowerCase().includes('cafe') ? 'cafe' : 'restaurant',
          });

          if (placeResult && placeResult.photos.length > 0) {
            const enrichedData: WebEnrichedData = {
              venueVerified: true,
              venueType: effectiveCategory.toLowerCase().includes('bar') ? 'bar' : 'restaurant',
              venueName: placeResult.name,
              venueDescription: placeResult.address || `${placeResult.name} - ${priceLevelToSymbol(placeResult.priceLevel)} - ${placeResult.rating ? `${placeResult.rating}⭐` : ''}`,
              primaryImageUrl: placeResult.photos[0].url,
              mediaUrls: placeResult.photos.map(photo => ({
                url: photo.url,
                type: 'image' as const,
                source: 'google_places'
              })),
              location: {
                address: placeResult.address,
                directionsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeResult.name + (placeResult.address ? ' ' + placeResult.address : ''))}`,
              },
              rating: placeResult.rating,
              reviewCount: placeResult.userRatingsTotal,
              priceRange: priceLevelToSymbol(placeResult.priceLevel) || undefined,
              website: placeResult.website,
              phoneNumber: placeResult.phoneNumber,
              suggestedCategory: effectiveCategory.toLowerCase().includes('bar') ? 'Bars & Nightlife' : 'Restaurants & Food',
              categoryConfidence: aiRecommendation.confidence,
              enrichedAt: new Date().toISOString(),
              enrichmentSource: 'google',
              reservationLinks: placeResult.website ? [
                { platform: 'Website', url: placeResult.website },
                { platform: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeResult.name)}` },
              ] : [
                { platform: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeResult.name)}` },
                { platform: 'Yelp', url: `https://www.yelp.com/search?find_desc=${encodeURIComponent(placeResult.name)}` },
              ],
            };

            // Save to both in-memory and persistent DB cache
            this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
            try {
              await storage.saveJournalEnrichmentCache({
                cacheKey,
                enrichedData: enrichedData as any,
                imageUrl: enrichedData.primaryImageUrl,
                verified: enrichedData.venueVerified,
                enrichmentSource: 'google',
                isComingSoon: false,
              });
            } catch (saveError) {
              console.warn(`[JOURNAL_WEB_ENRICH] Failed to save Google Places result to DB cache:`, saveError);
            }

            const elapsed = Date.now() - startTime;
            console.log(`[JOURNAL_WEB_ENRICH] Google Places enrichment successful in ${elapsed}ms: "${placeResult.name}" (${placeResult.photos.length} photos)`);

            return { entryId: entry.id, success: true, enrichedData };
          }
          console.log(`[JOURNAL_WEB_ENRICH] Google Places search failed for "${venueName}", falling back to Tavily`);
        } else {
          console.log(`[JOURNAL_WEB_ENRICH] Google Places not configured, using Tavily for restaurant`);
        }
      }

      // Default: Use Tavily or AI-generated query for all other content
      const searchQuery = aiRecommendation.searchQuery;

      // Search web for venue info (pass category for domain filtering)
      const searchResponse = await this.searchWeb(searchQuery, effectiveCategory);

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
        effectiveCategory,
        validation.confidence // Pass validation confidence
      );

      // Ensure Tavily results for movies/shows are NOT marked as verified
      // (only authoritative sources like TMDB, Google Books, Spotify should be verified)
      const isMovieCategory = ['movies', 'tv shows', 'Movies & TV Shows', 'movie', 'tv show', 'entertainment']
        .some(c => effectiveCategory.toLowerCase().includes(c.toLowerCase()));
      if (isMovieCategory) {
        enrichedData.venueVerified = false;
      }

      // Save to both in-memory and persistent DB cache
      this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
      try {
        await storage.saveJournalEnrichmentCache({
          cacheKey,
          enrichedData: enrichedData as any,
          imageUrl: enrichedData.primaryImageUrl,
          verified: enrichedData.venueVerified,
          enrichmentSource: 'tavily',
          isComingSoon: false,
        });
      } catch (saveError) {
        console.warn(`[JOURNAL_WEB_ENRICH] Failed to save Tavily result to DB cache:`, saveError);
      }

      const elapsed = Date.now() - startTime;
      console.log(`[JOURNAL_WEB_ENRICH] AI-recommended Tavily enrichment successful in ${elapsed}ms - venue type: ${enrichedData.venueType}, category: ${enrichedData.suggestedCategory}`);

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

  async enrichBatch(entries: JournalEntryForEnrichment[], forceRefresh: boolean = false): Promise<EnrichmentResult[]> {
    console.log(`[JOURNAL_WEB_ENRICH] Starting batch enrichment for ${entries.length} entries${forceRefresh ? ' (FORCE REFRESH)' : ''}`);

    // Filter entries that need enrichment (skip filter if forceRefresh)
    const needsEnrichment = forceRefresh ? entries : entries.filter(entry => {
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

    // =========================================================================
    // STEP 1: UNIVERSAL BATCH CONTEXT INFERENCE
    // Before processing individual items, analyze the batch as a whole
    // This helps us understand what type of collection we're dealing with
    // =========================================================================
    if (needsEnrichment.length >= 2) {
      try {
        const batchContext = await this.inferUniversalBatchContext(needsEnrichment);
        if (batchContext && batchContext.confidence > 0.5) {
          console.log(`[JOURNAL_WEB_ENRICH] Batch context established: ${batchContext.contentType} - "${batchContext.collectionDescription}"`);

          // PROPAGATE to TMDB service for tiered validation
          // This ensures TMDB's strict tiers use the year range from batch context
          if ((batchContext.contentType === 'movie' || batchContext.contentType === 'tv_show') && tmdbService.isAvailable()) {
            tmdbService.setBatchContext({
              inferredYear: batchContext.yearRange?.min || null,
              inferredYearRange: batchContext.yearRange || null,
              inferredLanguage: batchContext.inferredRegion === 'US' ? 'en' : (batchContext.inferredRegion === 'Korea' ? 'ko' : null),
              inferredMediaType: batchContext.contentType === 'movie' ? 'movie' : 'tv',
              inferredGenre: batchContext.inferredGenre || null,
              inferredRegion: batchContext.inferredRegion || null,
              collectionDescription: batchContext.collectionDescription,
              isUpcoming: batchContext.isUpcoming || false,
              isClassic: batchContext.isClassic || false,
              confidence: batchContext.confidence
            });
            console.log(`[JOURNAL_WEB_ENRICH] TMDB batch context propagated: year=${batchContext.yearRange?.min}-${batchContext.yearRange?.max}, region=${batchContext.inferredRegion}`);
          }
        }
      } catch (error) {
        console.warn(`[JOURNAL_WEB_ENRICH] Batch context inference failed, continuing without context:`, error);
      }
    }

    // =========================================================================
    // STEP 2: PROCESS INDIVIDUAL ENTRIES WITH BATCH CONTEXT
    // Each entry enrichment can now use the batch context for better matching
    // =========================================================================
    const results: EnrichmentResult[] = [];
    const batchSize = 3;

    for (let i = 0; i < needsEnrichment.length; i += batchSize) {
      const batch = needsEnrichment.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(entry => this.enrichJournalEntry(entry, forceRefresh))
      );
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < needsEnrichment.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // =========================================================================
    // STEP 3: CLEAR BATCH CONTEXT
    // Clean up after batch processing is complete
    // =========================================================================
    this.clearBatchContext();
    tmdbService.clearBatchContext(); // Also clear TMDB's propagated context

    const successCount = results.filter(r => r.success).length;
    console.log(`[JOURNAL_WEB_ENRICH] Batch complete: ${successCount}/${results.length} successful`);

    return results;
  }

  // ==========================================================================
  // VENUE INFO EXTRACTION
  // ==========================================================================

  /**
   * Extract EXACT title/venue name from entry text.
   * CRITICAL: Must extract the precise title to prevent content mismatches.
   * For "Watch Wicked for Good" - must extract "Wicked for Good", not something else.
   */
  private extractVenueInfo(text: string): { venueName?: string; city?: string; author?: string; exactTitle?: string } {
    const contentType = this.detectContentType(text);

    // MOVIE-specific extraction - CRITICAL for preventing mismatches
    if (contentType === 'movie' || contentType === 'movies') {
      const moviePatterns = [
        // PRIORITY 1: Single-quoted titles - e.g., "Stream or rent 'Die My Love'" -> "Die My Love"
        // These are very reliable because they have explicit delimiters
        /'([^']+)'/,
        // PRIORITY 2: Double-quoted titles - e.g., 'Watch "Sinners"' -> "Sinners"
        /"([^"]+)"/,
        // PRIORITY 3: "Watch [Title]" - common movie entry format (no quotes in title)
        // Allow hyphens within words (Spider-Man, X-Men), break on " - " (space-dash-space) or # or (
        /^(?:Watch|Watching|Watched|See|Saw|Stream|Streaming)\s+(.+?)(?:\s+[-–—]\s+|[#(]|$)/i,
        // PRIORITY 4: "Stream Sinners (#2 ranked movie)" - extract title between keyword and parenthesis
        /(?:watch|streaming|stream|see)\s+(.+?)\s*\(/i,
        // PRIORITY 5: Title followed by year in parentheses: "Title (2024)"
        /^([^"'(]+?)\s*\(\d{4}\)/,
        // PRIORITY 6: "Title - description" - extract before space-dash-space (allows hyphenated titles)
        // This catches "Blade Runner 2049 - a classic film", "Re-Animator - horror classic"
        /^(.+?)\s+[-–—]\s+/,
        // PRIORITY 7: "[Title] movie" or "[Title] film" - allow hyphens within title
        /^(.+?)\s+(?:movie|film)(?:\s|$)/i,
        // PRIORITY 8: Fallback - entire text if no delimiters found (for simple titles like "F1")
        /^(.+?)$/,
      ];

      for (const pattern of moviePatterns) {
        const match = text.match(pattern);
        if (match) {
          const extractedTitle = match[1]?.trim().replace(/^["']|["']$/g, '').replace(/\s+$/, '');
          if (extractedTitle && extractedTitle.length > 2) {
            console.log(`[JOURNAL_WEB_ENRICH] Movie extraction: title="${extractedTitle}"`);
            return {
              venueName: extractedTitle,
              exactTitle: extractedTitle,
              city: undefined,
              author: undefined
            };
          }
        }
      }
    }

    // BOOK-specific patterns
    if (contentType === 'book') {
      const bookPatterns = [
        // "Title" by Author Name
        /^["']([^"']+)["']\s+by\s+([A-Z][a-zA-Z\s.'-]+?)(?:\s*[-–—]|$)/i,
        // Read "Title" by Author - allow hyphens in titles
        /^(?:Read|Reading|Finished|Started)\s+["']?(.+?)["']?\s+by\s+([A-Z][a-zA-Z\s.'-]+?)(?:\s+[-–—]\s+|$)/i,
        // Title by First Last (proper name)
        /^(.+?)\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
        // Title - biography/novel/memoir/book
        /^(.+?)\s*[-–—]\s*(?:biography|novel|memoir|book|autobiography|guide|textbook)/i,
        // "Title" - description (for quoted titles)
        /^["']([^"']+)["']\s*[-–—]/,
      ];

      for (const pattern of bookPatterns) {
        const match = text.match(pattern);
        if (match) {
          const extractedTitle = match[1]?.trim().replace(/^["']|["']$/g, '');
          const extractedAuthor = match[2]?.trim();
          console.log(`[JOURNAL_WEB_ENRICH] Book extraction: title="${extractedTitle}", author="${extractedAuthor || 'none'}"`);
          return {
            venueName: extractedTitle,
            exactTitle: extractedTitle,
            city: undefined,
            author: extractedAuthor
          };
        }
      }

      // Fallback for books: use first part before space-dash-space as title (allows hyphenated titles)
      const dashSplit = text.split(/\s+[-–—]\s+/);
      if (dashSplit.length > 0 && dashSplit[0].length > 2) {
        const title = dashSplit[0].trim().replace(/^["']|["']$/g, '').replace(/^(?:Read|Reading|Finished|Started)\s+/i, '');
        console.log(`[JOURNAL_WEB_ENRICH] Book fallback extraction: title="${title}"`);
        return { venueName: title, exactTitle: title, city: undefined, author: undefined };
      }
    }

    // MUSIC-specific extraction
    if (contentType === 'music') {
      const musicPatterns = [
        // "Listen to [Artist/Song]" - allow hyphens in names, break on space-dash-space
        /^(?:Listen(?:ing)? to|Play(?:ing)?)\s+["']?(.+?)["']?(?:\s+[-–—]\s+|$)/i,
        // "[Artist] - [Album/Song]" - split on space-dash-space (allows hyphenated names)
        /^["']?(.+?)["']?\s+[-–—]\s+["']?(.+?)["']?$/,
        // Quoted: "Artist Name"
        /^["']([^"']+)["']/,
      ];

      for (const pattern of musicPatterns) {
        const match = text.match(pattern);
        if (match) {
          const extractedArtist = match[1]?.trim().replace(/^["']|["']$/g, '');
          console.log(`[JOURNAL_WEB_ENRICH] Music extraction: artist/song="${extractedArtist}"`);
          return {
            venueName: extractedArtist,
            exactTitle: extractedArtist,
            city: undefined,
            author: undefined
          };
        }
      }
    }

    // FITNESS-specific extraction
    if (contentType === 'exercise') {
      const fitnessPatterns = [
        // "[Exercise name] workout/exercise" - allow hyphens (e.g., "high-intensity")
        /^["']?(.+?)["']?\s+(?:workout|exercise|routine|training|pose)/i,
        // "Do [Exercise]" - allow hyphens, break on space-dash-space
        /^(?:Do|Try|Practice)\s+["']?(.+?)["']?(?:\s+[-–—]\s+|$)/i,
      ];

      for (const pattern of fitnessPatterns) {
        const match = text.match(pattern);
        if (match) {
          const extractedExercise = match[1]?.trim().replace(/^["']|["']$/g, '');
          console.log(`[JOURNAL_WEB_ENRICH] Fitness extraction: exercise="${extractedExercise}"`);
          return {
            venueName: extractedExercise,
            exactTitle: extractedExercise,
            city: undefined,
            author: undefined
          };
        }
      }
    }

    // Standard venue patterns for restaurants, travel, etc.
    const patterns = [
      /^["']?([A-Z].+?)["']?\s+[-–—]\s+/i, // "Name - description" (space-dash-space, allows hyphens in names)
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

    return { venueName, city, author: undefined };
  }

  // ==========================================================================
  // CONTENT TYPE DETECTION - CRITICAL for correct enrichment
  // ==========================================================================

  /**
   * Detect the actual content type from the entry text BEFORE searching.
   * This prevents misclassification like "Biography" being searched as a museum.
   * Returns the detected category or null if no strong signals found.
   *
   * PRIORITY ORDER: Travel > Movies > Music > Restaurant > Fitness > Books
   * Travel is checked first to prevent "Lonely Planet Guide to Paris" being detected as a book.
   */
  private detectContentType(text: string): string | null {
    const lowerText = text.toLowerCase();

    // TRAVEL - Check FIRST to prevent travel guides from being detected as books
    // "Lonely Planet Guide to Paris" should be travel, not book
    const travelSignals = [
      /\bhotel\b/i,
      /\bresort\b/i,
      /\btravel\b/i,
      /\bflight\b/i,
      /\bairport\b/i,
      /\bvacation\b/i,
      /\btrip\b/i,
      /\bvisit(?:ed|ing)?\s+(?:the\s+)?[A-Z]/,  // "visited Paris", "visiting the Louvre"
      /\bstayed at\b/i,
      /\bmuseum\b/i,
      /\blandmark\b/i,
      /\bbeach\b/i,
      /\bguide\s+to\s+[A-Z]/i,  // "Guide to Paris" - TRAVEL, not book
      /\btravel guide\b/i,
      /\blonely planet\b/i,
      /\bfodor/i,
      /\btripadvisor\b/i,
      /\bbooking\.com\b/i,
      /\bairbnb\b/i,
      /\bdestination\b/i,
      /\bsightseeing\b/i,
      /\btour\b/i,
      /\bitinerary\b/i,
    ];

    // BOOKS - Strong signals (REMOVED: /\bguide\s+to\b/i - too generic, matches travel)
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
      // REMOVED: /\bguide\s+to\b/i - matches travel guides like "Lonely Planet Guide to Paris"
      /\bself-help\b/i,
      /\bpaperback\b/i,
      /\bhardcover\b/i,
      /\baudiobook\b/i,
    ];

    // RESTAURANTS/BARS - Domain signals
    const restaurantSignals = [
      /\bdinner\b/i,
      /\blunch\b/i,
      /\bbreakfast\b/i,
      /\bbrunch\b/i,
      /\beating\b/i,
      /\bfood\b/i,
      /\bcuisine\b/i,
      /\bdelicious\b/i,
      /\btasty\b/i,
      /\bmenu\b/i,
      /\breservation\b/i,
      /\bbar\b/i,
      /\bpub\b/i,
      /\bdrinks\b/i,
      /\bcocktail\b/i,
      /\brestaurant\b/i,
      /\bcafe\b/i,
      /\bbistro\b/i,
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
      /\branked movie\b/i,   // "#1 ranked movie"
      /\bfilm release\b/i,   // "2024 film release"
      /\brelease\b/i,        // Movie release context
      /\bpremiere\b/i,       // Movie premiere
      /\bfandango\b/i,       // Ticket site
      /\bamc\b/i,            // Theater chain
      /\bimax\b/i,           // IMAX format
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
    const travelMatches = travelSignals.filter(p => p.test(text)).length;
    const restaurantMatches = restaurantSignals.filter(p => p.test(text)).length;
    const bookMatches = bookSignals.filter(p => p.test(text)).length;
    const movieMatches = movieSignals.filter(p => p.test(text)).length;
    const musicMatches = musicSignals.filter(p => p.test(text)).length;
    const fitnessMatches = fitnessSignals.filter(p => p.test(text)).length;

    // Need at least 1 signal to make a detection
    const maxMatches = Math.max(travelMatches, restaurantMatches, bookMatches, movieMatches, musicMatches, fitnessMatches);

    if (maxMatches === 0) {
      return null;
    }

    // Return the VENUE TYPE (not category) with most matches
    // PRIORITY ORDER: Travel > Movies > Music > Restaurant > Fitness > Books
    // Travel checked first to prevent "Guide to Paris" being detected as book
    // Movies checked second because TMDB validation is most authoritative
    if (travelMatches === maxMatches && travelMatches >= 1) {
      return 'travel'; // venueType
    }
    if (movieMatches === maxMatches && movieMatches >= 1) {
      return 'movie'; // venueType, not category
    }
    if (musicMatches === maxMatches && musicMatches >= 1) {
      return 'music'; // venueType
    }
    if (restaurantMatches === maxMatches && restaurantMatches >= 1) {
      return 'restaurant';
    }
    if (fitnessMatches === maxMatches && fitnessMatches >= 1) {
      return 'exercise'; // venueType
    }
    if (bookMatches === maxMatches && bookMatches >= 1) {
      return 'book'; // venueType, not category
    }

    return null;
  }

  private buildSearchQuery(venueName: string, city?: string, category?: string): string {
    // CRITICAL: Use quotes around exact title for precise matching
    // This prevents "Wicked for Good" from returning "Puppy Love" results
    let query = `"${venueName}"`;

    // =========================================================================
    // BATCH CONTEXT ENHANCEMENT
    // If we have batch context, use it to add relevant search constraints
    // =========================================================================
    const batchCtx = this.currentBatchContext;
    if (batchCtx && batchCtx.confidence > 0.5) {
      // Add region/location context
      if (batchCtx.inferredRegion) {
        query += ` ${batchCtx.inferredRegion}`;
      }

      // Add cuisine context for restaurants
      if (batchCtx.inferredCuisine) {
        query += ` ${batchCtx.inferredCuisine}`;
      }

      // Add era/year context for temporal items
      if (batchCtx.inferredEra) {
        query += ` ${batchCtx.inferredEra}`;
      } else if (batchCtx.yearRange) {
        query += ` ${batchCtx.yearRange.min}-${batchCtx.yearRange.max}`;
      }

      // Add genre context
      if (batchCtx.inferredGenre) {
        query += ` ${batchCtx.inferredGenre}`;
      }

      // Add style context (luxury, casual, etc.)
      if (batchCtx.inferredStyle) {
        query += ` ${batchCtx.inferredStyle}`;
      }

      console.log(`[SEARCH_QUERY] Enhanced with batch context: "${query.substring(0, 100)}..."`);
    }

    // Category-specific search strategies for better image/info retrieval
    // OPTIMIZED: Better search terms for music and movies to get album art, posters, streaming links
    const categorySearchConfig: Record<string, { suffix: string; imageHint: string }> = {
      // VenueType values (from detectContentType)
      book: { suffix: 'book cover author ISBN', imageHint: 'cover' },
      // MUSIC: Search for Spotify/Apple Music pages which have album art and streaming links
      music: { suffix: 'Spotify artist album cover art discography', imageHint: 'album cover' },
      // MOVIES: Search for IMDB/TMDB which have official posters and streaming info
      movie: { suffix: 'IMDB movie poster cast streaming where to watch', imageHint: 'movie poster' },
      // FITNESS/EXERCISE: Optimized for step-by-step instruction images
      exercise: { suffix: 'exercise how to proper form step by step muscles worked', imageHint: 'exercise form' },
      // Category names
      // MOVIES: Optimized for poster retrieval and streaming info
      movies: { suffix: 'IMDB movie poster streaming JustWatch where to watch', imageHint: 'movie poster' },
      'Movies & TV Shows': { suffix: 'IMDB TV series poster streaming JustWatch where to watch', imageHint: 'poster' },
      books: { suffix: 'book cover author ISBN', imageHint: 'cover' },
      'Books & Reading': { suffix: 'book cover author ISBN', imageHint: 'cover' },
      // FITNESS: Get multiple instructional images showing proper form
      fitness: { suffix: 'exercise how to proper form technique muscles worked step by step guide', imageHint: 'exercise form' },
      'Health & Fitness': { suffix: 'exercise how to proper form technique muscles worked step by step', imageHint: 'exercise form' },
      wellness: { suffix: 'wellness spa self-care routine benefits how to', imageHint: 'wellness' },
      'self-care': { suffix: 'self-care routine wellness practice benefits', imageHint: 'wellness' },
      // MUSIC: Optimized for album art and streaming platforms
      'Music & Artists': { suffix: 'Spotify Apple Music artist album art discography genre', imageHint: 'album cover' },
      restaurants: { suffix: 'restaurant menu photos Yelp', imageHint: 'food venue' },
      'Restaurants & Food': { suffix: 'restaurant menu photos Yelp reviews', imageHint: 'food venue' },
      bars: { suffix: 'bar cocktail menu photos nightlife', imageHint: 'bar venue' },
      travel: { suffix: 'destination hotel attraction photos TripAdvisor', imageHint: 'travel' },
      'Travel & Places': { suffix: 'destination attraction photos TripAdvisor things to do', imageHint: 'travel' },
      hotels: { suffix: 'hotel resort accommodation photos booking', imageHint: 'hotel' },
      activities: { suffix: 'activity event tickets venue', imageHint: 'activity' },
      entertainment: { suffix: 'entertainment show event tickets', imageHint: 'entertainment' },
      hobbies: { suffix: 'hobby activity how to learn', imageHint: 'hobby' },
      'Hobbies & Interests': { suffix: 'hobby activity guide', imageHint: 'hobby' },
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

  private async searchWeb(query: string, category?: string): Promise<{ results: any[]; images: string[] }> {
    if (!isTavilyConfigured()) {
      console.warn('[JOURNAL_WEB_ENRICH] Tavily not configured');
      return { results: [], images: [] };
    }

    try {
      // Category-specific domain filtering for more precise results
      const domainFilters: Record<string, string[]> = {
        // RESTAURANTS: Focus on review sites
        restaurants: ['yelp.com', 'foursquare.com', 'tripadvisor.com', 'opentable.com', 'eater.com', 'michelinguide.com', 'theinfatuation.com', 'zomato.com'],
        'Restaurants & Food': ['yelp.com', 'foursquare.com', 'tripadvisor.com', 'opentable.com', 'zomato.com'],
        // MOVIES: Focus on movie databases
        movies: ['imdb.com', 'rottentomatoes.com', 'justwatch.com', 'themoviedb.org'],
        'Movies & TV Shows': ['imdb.com', 'rottentomatoes.com', 'justwatch.com'],
        movie: ['imdb.com', 'rottentomatoes.com', 'justwatch.com', 'themoviedb.org'],
        // MUSIC: Focus on streaming and music info sites
        music: ['spotify.com', 'apple.com', 'allmusic.com', 'genius.com', 'last.fm'],
        'Music & Artists': ['spotify.com', 'apple.com', 'allmusic.com', 'genius.com'],
        // FITNESS: Focus on exercise instruction sites with images
        fitness: ['muscleandstrength.com', 'bodybuilding.com', 'exrx.net', 'acefitness.org', 'verywellfit.com'],
        exercise: ['muscleandstrength.com', 'bodybuilding.com', 'exrx.net', 'acefitness.org'],
        // TRAVEL: Focus on travel review sites
        travel: ['tripadvisor.com', 'lonelyplanet.com', 'booking.com', 'expedia.com'],
        'Travel & Places': ['tripadvisor.com', 'lonelyplanet.com', 'booking.com'],
        // HOBBIES: Broad search for hobby content
        hobbies: ['reddit.com', 'instructables.com', 'wikihow.com'],
        'Hobbies & Interests': ['reddit.com', 'instructables.com', 'wikihow.com'],
        // STYLE/FASHION: Focus on fashion sites
        style: ['vogue.com', 'gq.com', 'nordstrom.com', 'zara.com', 'asos.com'],
        fashion: ['vogue.com', 'gq.com', 'nordstrom.com', 'zara.com', 'asos.com'],
        // EVENTS/ACTIVITIES: Focus on event ticketing sites
        activities: ['eventbrite.com', 'ticketmaster.com', 'stubhub.com', 'bandsintown.com', 'dice.fm'],
        events: ['eventbrite.com', 'ticketmaster.com', 'stubhub.com', 'bandsintown.com'],
        entertainment: ['eventbrite.com', 'ticketmaster.com', 'timeout.com', 'thrillist.com'],
        // BARS: Focus on nightlife sites
        bars: ['yelp.com', 'foursquare.com', 'tripadvisor.com', 'thrillist.com', 'timeout.com'],
        // HOTELS: Focus on booking sites
        hotels: ['booking.com', 'tripadvisor.com', 'hotels.com', 'expedia.com'],
      };

      const includeDomains = category ? domainFilters[category] : undefined;

      // Fitness/exercise needs more images for instruction
      const isFitnessCategory = category === 'fitness' || category === 'exercise' ||
                                category === 'Health & Fitness';
      const maxResults = isFitnessCategory ? 8 : 5;

      const searchOptions: any = {
        searchDepth: 'advanced',
        maxResults,
        includeImages: true,
        includeAnswer: true,
      };

      // Only add domain filter if we have specific domains for this category
      if (includeDomains && includeDomains.length > 0) {
        searchOptions.includeDomains = includeDomains;
        console.log(`[JOURNAL_WEB_ENRICH] Searching with domain filter: ${includeDomains.join(', ')}`);
      }

      const response = await tavilySearch(query, searchOptions);

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
  // CONTENT VALIDATION - Prevent mismatches
  // ==========================================================================

  /**
   * Validate that search results match the expected title.
   * CRITICAL: Prevents showing "Puppy Love" image for "Wicked for Good" entry.
   * 
   * For movies/books/music: Strict validation (70% word match required)
   * For activities/events/travel: Relaxed validation (40% word match, or skip validation)
   * For restaurants: Moderate validation (50% word match)
   */
  private validateContentMatch(
    results: any[],
    expectedTitle: string,
    category?: string
  ): { isValid: boolean; confidence: number; matchedResult?: any } {
    if (!expectedTitle || !results.length) {
      return { isValid: false, confidence: 0 };
    }

    // Categories where content validation is strict (real-world content that must match)
    const strictCategories = ['movies', 'movie', 'books', 'book', 'music', 'Movies & TV Shows', 'Music & Artists'];
    
    // Categories where validation should be relaxed (user-created events/activities)
    const relaxedCategories = ['activities', 'events', 'travel', 'hobbies', 'entertainment', 'notes'];
    
    const isStrictCategory = strictCategories.includes(category || '');
    const isRelaxedCategory = relaxedCategories.includes(category || '');
    
    // For relaxed categories, accept any result as we're just looking for related imagery
    if (isRelaxedCategory) {
      console.log(`[JOURNAL_WEB_ENRICH] Content validation SKIPPED for relaxed category "${category}": "${expectedTitle}"`);
      return { isValid: true, confidence: 0.6, matchedResult: results[0] };
    }

    const normalizedExpected = expectedTitle.toLowerCase().trim();
    const expectedWords = normalizedExpected.split(/\s+/).filter(w => w.length > 2);
    
    // Threshold based on category type
    const matchThreshold = isStrictCategory ? 0.7 : 0.5;

    for (const result of results) {
      const resultTitle = (result.title || '').toLowerCase();
      const resultContent = (result.content || '').toLowerCase();
      const resultUrl = (result.url || '').toLowerCase();

      // Check if result contains the expected title
      const titleMatch = resultTitle.includes(normalizedExpected) ||
                        normalizedExpected.includes(resultTitle.split(/[:\-–—|]/)[0].trim());
      
      // Check if most expected words appear in result
      const wordMatches = expectedWords.filter(word => 
        resultTitle.includes(word) || resultContent.includes(word) || resultUrl.includes(word)
      );
      const wordMatchRatio = expectedWords.length > 0 ? wordMatches.length / expectedWords.length : 0;

      if (titleMatch) {
        console.log(`[JOURNAL_WEB_ENRICH] Content validation PASSED (title match): "${expectedTitle}" found in result`);
        return { isValid: true, confidence: 0.95, matchedResult: result };
      }

      if (wordMatchRatio >= matchThreshold) {
        console.log(`[JOURNAL_WEB_ENRICH] Content validation PASSED (word match ${(wordMatchRatio * 100).toFixed(0)}%): "${expectedTitle}"`);
        return { isValid: true, confidence: wordMatchRatio, matchedResult: result };
      }
    }

    console.warn(`[JOURNAL_WEB_ENRICH] Content validation FAILED: No results match "${expectedTitle}" (threshold: ${matchThreshold * 100}%)`);
    return { isValid: false, confidence: 0 };
  }

  /**
   * Filter images that are likely relevant to the expected title.
   * Checks image URL and alt text for title keywords.
   */
  private filterRelevantImages(images: string[], expectedTitle: string): string[] {
    if (!expectedTitle || !images.length) return images;

    const normalizedTitle = expectedTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const titleWords = expectedTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // Score images by relevance
    const scoredImages = images.map(url => {
      const normalizedUrl = url.toLowerCase();
      let score = 0;

      // Check if URL contains title words
      for (const word of titleWords) {
        if (normalizedUrl.includes(word)) {
          score += 2;
        }
      }

      // Boost images from authoritative sources for movies/books
      if (normalizedUrl.includes('imdb.com')) score += 3;
      if (normalizedUrl.includes('tmdb.org')) score += 3;
      if (normalizedUrl.includes('amazon.com')) score += 2;
      if (normalizedUrl.includes('goodreads.com')) score += 2;
      if (normalizedUrl.includes('googleapis.com/books')) score += 3;

      return { url, score };
    });

    // Sort by score and return
    return scoredImages
      .sort((a, b) => b.score - a.score)
      .map(item => item.url);
  }

  // ==========================================================================
  // RESULT PARSING
  // ==========================================================================

  private async parseSearchResults(
    results: any[],
    images: string[],
    venueName: string,
    city?: string,
    category?: string,
    validationConfidence?: number
  ): Promise<WebEnrichedData> {
    const enrichedData: WebEnrichedData = {
      venueVerified: false,
      venueName,
      enrichedAt: new Date().toISOString(),
      enrichmentSource: 'tavily',
      rawSearchResults: results.slice(0, 3), // Keep top 3 for reference
    };

    // CONTENT VALIDATION: Check if results match the expected title
    const validation = this.validateContentMatch(results, venueName, category);
    if (!validation.isValid) {
      console.warn(`[JOURNAL_WEB_ENRICH] Content validation failed for "${venueName}" - returning failure to preserve existing enrichment`);
      // Return null to signal failure - caller should retain existing enrichment
      // This prevents losing verified data on refresh when Tavily doesn't find matching results
      throw new Error(`Content validation failed: no results match "${venueName}"`);
    }

    enrichedData.venueVerified = validation.confidence > 0.8;

    // Extract data from search results
    const combinedContent = results.map(r => r.content || '').join('\n');
    const urls = results.map(r => r.url).filter(Boolean);

    // Use images from Tavily response (passed as parameter)
    // Filter out logos, icons, and small thumbnail indicators
    let filteredImages = images.filter((url: string) => {
      if (!url) return false;
      const lowerUrl = url.toLowerCase();
      // Exclude common non-content images
      if (lowerUrl.includes('logo') || lowerUrl.includes('icon') || lowerUrl.includes('favicon')) return false;
      if (lowerUrl.includes('avatar') || lowerUrl.includes('profile')) return false;
      if (lowerUrl.includes('placeholder') || lowerUrl.includes('default')) return false;
      // Exclude tiny thumbnails (common patterns)
      if (/[_\-](?:xs|sm|thumb|tiny|50|75|100)\./i.test(url)) return false;
      return true;
    });

    // CRITICAL: Sort images by relevance to the expected title to prevent mismatches
    filteredImages = this.filterRelevantImages(filteredImages, venueName).slice(0, 5);

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
      enrichedData.categoryConfidence = validationConfidence || 0.85; // Use dynamic confidence from validation
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
        { platform: 'IMDB', url: `https://www.imdb.com/find/?q=${searchTerm}&s=tt` },
      ];
    }

    // Generate streaming links for MUSIC if not provided by AI
    // Supports songs, albums, and artists
    const isMusic = enrichedData.venueType === 'music' || enrichedData.venueType === 'artist' ||
                    enrichedData.venueType === 'album' || category === 'music' ||
                    category === 'Music & Artists';
    if (isMusic && (!enrichedData.streamingLinks || enrichedData.streamingLinks.length === 0)) {
      const searchTerm = encodeURIComponent(venueName);
      enrichedData.streamingLinks = [
        { platform: 'Spotify', url: `https://open.spotify.com/search/${searchTerm}` },
        { platform: 'Apple Music', url: `https://music.apple.com/us/search?term=${searchTerm}` },
        { platform: 'YouTube Music', url: `https://music.youtube.com/search?q=${searchTerm}` },
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
    // OPTIMIZED: Better prompts for music and movies to extract streaming links and album art URLs
    const categoryPrompts: Record<string, string> = {
      // VenueType values
      book: `This is a BOOK. Extract: title, author name, genre, publication year, rating (1-5 stars), publisher, where to buy.`,
      // MUSIC: Enhanced prompt for songs, albums, and artists
      music: `This is MUSIC (song, album, or artist). Extract:
- Artist/band name (the performer)
- Song or album title (if mentioned)
- Genre (e.g., pop, rock, hip-hop, R&B, country, jazz, classical, electronic)
- Release year
- Record label
- Streaming platforms where available (Spotify, Apple Music, YouTube Music, Amazon Music, Tidal)
- Any Spotify or Apple Music URLs found in the content`,
      // MOVIES: Enhanced prompt for streaming availability
      movie: `This is a MOVIE or TV SHOW. Extract:
- Title
- Release year
- Director name
- Main cast (top 3 actors)
- Genre (e.g., action, comedy, drama, thriller, horror, sci-fi, documentary)
- IMDB rating (0-10 scale)
- Runtime (in minutes or "X hr Y min" format)
- Streaming platforms where available (Netflix, Amazon Prime, Hulu, Disney+, HBO Max, Apple TV+, Paramount+)
- Any streaming URLs or JustWatch links found`,
      exercise: `This is an EXERCISE/WORKOUT. Extract: exercise name, muscle groups worked, difficulty level, equipment needed, duration.`,
      hotel: `This is a HOTEL or ACCOMMODATION. Extract: name, location, price range, rating, amenities, and 3-5 key highlights (e.g., "ocean view", "rooftop pool", "free breakfast").`,
      museum: `This is a MUSEUM or ATTRACTION. Extract: name, location, admission price, hours, and 3-5 key highlights (e.g., "impressionist collection", "interactive exhibits", "guided tours").`,
      store: `This is a STORE or SHOP. Extract: name, location, price range, and product categories sold (e.g., "electronics", "clothing", "home goods").`,
      boutique: `This is a BOUTIQUE or FASHION STORE. Extract: name, location, price range, and product categories (e.g., "women's fashion", "accessories", "designer brands").`,
      // Category names
      travel: `This is a TRAVEL destination, hotel, or attraction. Extract: name, location, price range, rating, and 3-5 key highlights or features.`,
      shopping: `This is a SHOPPING venue or store. Extract: name, location, price range, and product categories sold.`,
      movies: `This is a MOVIE or TV SHOW. Extract: title, release year, director, main cast, genre, IMDB rating (0-10), runtime, and ALL streaming platforms where it's available (Netflix, Prime, Hulu, Disney+, HBO Max, etc).`,
      'Movies & TV Shows': `This is a MOVIE or TV SHOW. Extract: title, release year, director, main cast, genre, IMDB rating (0-10), runtime, and ALL streaming platforms where it's available.`,
      books: `This is a BOOK. Extract: title, author name, genre, publication year, rating (1-5 stars), publisher, where to buy.`,
      'Books & Reading': `This is a BOOK. Extract: title, author name, genre, publication year, rating (1-5 stars), publisher, where to buy.`,
      fitness: `This is an EXERCISE/WORKOUT. Extract: exercise name, muscle groups worked, difficulty level, equipment needed, duration.`,
      'Music & Artists': `This is MUSIC (song, album, or artist). Extract: artist name, song/album title, genre, release year, and ALL streaming platforms (Spotify, Apple Music, YouTube Music, etc).`,
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
  "genre": "genre/category",

  // For BOOKS only:
  "author": "author name",
  "publisher": "publisher name",
  "publicationYear": "year",
  "purchaseLinks": [{"platform": "Amazon", "url": "..."}, {"platform": "Goodreads", "url": "..."}],

  // For MOVIES/TV only:
  "director": "director name",
  "cast": ["actor1", "actor2", "actor3"],
  "releaseYear": "year",
  "runtime": "duration",
  "streamingLinks": [{"platform": "Netflix", "url": "..."}, {"platform": "Amazon Prime", "url": "..."}],

  // For MUSIC only:
  "artist": "artist/band name",
  "albumTitle": "album name if applicable",
  "recordLabel": "label name",
  "streamingLinks": [{"platform": "Spotify", "url": "..."}, {"platform": "Apple Music", "url": "..."}],

  // For FITNESS only:
  "muscleGroups": ["chest", "triceps"],
  "difficulty": "beginner|intermediate|advanced",
  "duration": "30 mins",
  "equipment": ["dumbbells", "bench"],

  // For TRAVEL (hotels, museums, attractions):
  "highlights": ["ocean view", "rooftop pool", "free breakfast"],
  "amenities": ["WiFi", "parking", "spa"],

  // For SHOPPING (stores, boutiques):
  "productCategories": ["electronics", "clothing", "accessories"],

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

      // TRAVEL fields (hotels, museums, attractions)
      if (parsed.highlights && Array.isArray(parsed.highlights)) {
        result.highlights = parsed.highlights;
      }
      if (parsed.amenities && Array.isArray(parsed.amenities)) {
        result.amenities = parsed.amenities;
      }

      // SHOPPING fields (stores, boutiques)
      if (parsed.productCategories && Array.isArray(parsed.productCategories)) {
        result.productCategories = parsed.productCategories;
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

  // Generate cache key from extracted venue name directly
  // This is preferred when we've already extracted the correct venue name
  // to avoid cache collisions when entries share the same ID
  private generateCacheKeyFromVenue(venueName: string, city: string): string {
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
    // IMPORTANT: Order matters - more specific patterns should come before generic ones
    const categoryPatterns: Array<{ pattern: RegExp; category: string; venueType: string }> = [
      // HIGH PRIORITY: NYE/Party events should be activities, NOT music (even if they mention music/artists)
      { pattern: /\b(NYE|new\s*year'?s?\s*eve|new\s*year\s*party|party\s*event|parties\s*event|celebration\s*event|nightlife\s*event)\b/i, category: 'activities', venueType: 'event' },
      // Events with times (8:00 PM, 9:00 PM etc.) are typically party/event venues
      { pattern: /\d{1,2}:\d{2}\s*(PM|AM)\s*-?\s*\d{1,2}:\d{2}\s*(PM|AM)/i, category: 'activities', venueType: 'event' },
      { pattern: /restaurant|cafe|diner|bistro|eatery|food|cuisine|dish|meal/i, category: 'restaurants', venueType: 'restaurant' },
      { pattern: /bar|pub|lounge|cocktail|beer|wine|drinks?/i, category: 'restaurants', venueType: 'bar' },
      { pattern: /nightclub|club|dancing|dj|party venue|party/i, category: 'activities', venueType: 'nightclub' },
      { pattern: /movie|cinema|film|theater|screening/i, category: 'movies', venueType: 'movie' },
      // Music category is for songs/albums/playlists, not events that feature music
      { pattern: /\b(album|playlist|track|song|listen\s*to)\b/i, category: 'music', venueType: 'music' },
      { pattern: /hotel|resort|airbnb|hostel|stay|vacation|trip|travel|visit/i, category: 'travel', venueType: 'hotel' },
      { pattern: /museum|gallery|exhibit|art|attraction/i, category: 'travel', venueType: 'museum' },
      { pattern: /book|read|author|novel|library/i, category: 'books', venueType: 'book' },
      { pattern: /shop|store|buy|purchase|mall|boutique/i, category: 'shopping', venueType: 'store' },
      { pattern: /gym|workout|fitness|yoga|exercise|spa|wellness/i, category: 'fitness', venueType: 'exercise' },
      { pattern: /outfit|style|fashion|clothes|wear/i, category: 'style', venueType: 'boutique' },
      // Generic music patterns last - only matches if no event patterns matched first
      { pattern: /\bconcert|live\s*show|band\s+performing/i, category: 'music', venueType: 'music' },
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
