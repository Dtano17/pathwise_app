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
import { tmdbService } from './tmdbService';
import { spotifyEnrichmentService } from './spotifyEnrichmentService';

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
  // MAIN ENRICHMENT METHOD
  // ==========================================================================

  async enrichJournalEntry(entry: JournalEntryForEnrichment, forceRefresh: boolean = false): Promise<EnrichmentResult> {
    const startTime = Date.now();
    console.log(`[JOURNAL_WEB_ENRICH] Enriching entry ${entry.id}: "${entry.text.substring(0, 50)}..."${forceRefresh ? ' (FORCE REFRESH)' : ''}`);

    try {
      // Check cache first (skip if force refresh)
      const cacheKey = this.generateCacheKey(entry);
      if (!forceRefresh) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          console.log(`[JOURNAL_WEB_ENRICH] Cache hit for ${entry.id}`);
          return { entryId: entry.id, success: true, enrichedData: cached.data };
        }
      } else {
        // Clear cache for this entry on force refresh
        this.cache.delete(cacheKey);
        console.log(`[JOURNAL_WEB_ENRICH] Cache cleared for forced refresh of ${entry.id}`);
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

      // BOOKS: Use Google Books API for reliable cover images and metadata
      const isBook = effectiveCategory === 'book' || effectiveCategory === 'books' ||
                     entry.category === 'books' || entry.category === 'Books & Reading';

      if (isBook) {
        const extractedAuthor = (extractedInfo as any).author;
        const googleBooksResult = await this.searchGoogleBooks(venueName, extractedAuthor);

        if (googleBooksResult) {
          // Build enriched data from Google Books
          const enrichedData: WebEnrichedData = {
            venueVerified: true,
            venueType: 'book',
            venueName,
            venueDescription: googleBooksResult.description,
            primaryImageUrl: googleBooksResult.coverUrl,
            author: googleBooksResult.author,
            publisher: googleBooksResult.publisher,
            publicationYear: googleBooksResult.publishedDate?.substring(0, 4),
            suggestedCategory: 'books',
            categoryConfidence: 0.95,
            enrichedAt: new Date().toISOString(),
            enrichmentSource: 'google',
            // Generate purchase links with ISBN for better results
            purchaseLinks: googleBooksResult.isbn ? [
              { platform: 'Amazon', url: `https://www.amazon.com/s?k=${googleBooksResult.isbn}&i=stripbooks` },
              { platform: 'Goodreads', url: `https://www.goodreads.com/search?q=${googleBooksResult.isbn}` },
              { platform: 'Google Books', url: googleBooksResult.infoLink || `https://books.google.com/books?isbn=${googleBooksResult.isbn}` }
            ] : [
              { platform: 'Amazon', url: `https://www.amazon.com/s?k=${encodeURIComponent(venueName + (googleBooksResult.author ? ' ' + googleBooksResult.author : ''))}&i=stripbooks` },
              { platform: 'Goodreads', url: `https://www.goodreads.com/search?q=${encodeURIComponent(venueName)}` }
            ]
          };

          // Cache the result
          this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });

          const elapsed = Date.now() - startTime;
          console.log(`[JOURNAL_WEB_ENRICH] Enriched book ${entry.id} via Google Books in ${elapsed}ms`);

          return {
            entryId: entry.id,
            success: true,
            enrichedData
          };
        }
        // Fall through to Tavily search if Google Books fails
        console.log(`[JOURNAL_WEB_ENRICH] Google Books API returned no results, falling back to Tavily`);
      }

      // MOVIES/TV: Use TMDB API for accurate movie posters and metadata
      const isMovie = effectiveCategory === 'movie' || effectiveCategory === 'movies' ||
                      entry.category === 'movies' || entry.category === 'Movies & TV Shows' ||
                      entry.category === 'Movies & TV';
      
      if (isMovie && tmdbService.isAvailable()) {
        console.log(`[JOURNAL_WEB_ENRICH] Using TMDB for movie: "${venueName}"`);
        const tmdbResult = await tmdbService.searchMovie(venueName);
        
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
            suggestedCategory: 'movies',
            categoryConfidence: 0.98,
            enrichedAt: new Date().toISOString(),
            enrichmentSource: 'google',
            streamingLinks: [
              { platform: 'TMDB', url: `https://www.themoviedb.org/${tmdbResult.mediaType}/${tmdbResult.tmdbId}` },
              { platform: 'JustWatch', url: `https://www.justwatch.com/us/search?q=${encodeURIComponent(tmdbResult.title)}` },
              { platform: 'IMDB', url: `https://www.imdb.com/find?q=${encodeURIComponent(tmdbResult.title)}` }
            ]
          };

          this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
          const elapsed = Date.now() - startTime;
          console.log(`[JOURNAL_WEB_ENRICH] Enriched movie ${entry.id} via TMDB in ${elapsed}ms: "${tmdbResult.title}"`);

          return { entryId: entry.id, success: true, enrichedData };
        }
        console.log(`[JOURNAL_WEB_ENRICH] TMDB returned no results, falling back to Tavily`);
      }

      // MUSIC: Use Spotify API for accurate artist/album images
      const isMusic = effectiveCategory === 'music' || effectiveCategory === 'Music & Artists' ||
                      entry.category === 'music' || entry.category === 'Music & Artists';
      
      if (isMusic) {
        const spotifyAvailable = await spotifyEnrichmentService.isAvailable();
        if (spotifyAvailable) {
          console.log(`[JOURNAL_WEB_ENRICH] Using Spotify for music: "${venueName}"`);
          const spotifyResult = await spotifyEnrichmentService.searchMusic(venueName);
          
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
              categoryConfidence: 0.98,
              enrichedAt: new Date().toISOString(),
              enrichmentSource: 'google',
              streamingLinks: [
                { platform: 'Spotify', url: spotifyResult.spotifyUrl },
                { platform: 'Apple Music', url: `https://music.apple.com/search?term=${encodeURIComponent(spotifyResult.name)}` }
              ]
            };

            this.cache.set(cacheKey, { data: enrichedData, timestamp: Date.now() });
            const elapsed = Date.now() - startTime;
            console.log(`[JOURNAL_WEB_ENRICH] Enriched music ${entry.id} via Spotify in ${elapsed}ms: "${spotifyResult.name}"`);

            return { entryId: entry.id, success: true, enrichedData };
          }
        }
        console.log(`[JOURNAL_WEB_ENRICH] Spotify returned no results, falling back to Tavily`);
      }

      // RESTAURANTS/BARS: Fallback to Tavily as primary source for restaurant data
      // (Google Places integration removed due to cost considerations)
      const isRestaurant = effectiveCategory === 'restaurant' || effectiveCategory === 'restaurants' ||
                           effectiveCategory === 'bar' || effectiveCategory === 'bars' ||
                           entry.category === 'restaurants' || entry.category === 'bars' ||
                           entry.category === 'Restaurants & Food';

      // Build search query with the corrected category
      const searchQuery = this.buildSearchQuery(venueName, city, effectiveCategory);

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

    // Process in parallel with rate limiting (max 3 concurrent)
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
    if (contentType === 'movie') {
      const moviePatterns = [
        // "Watch [Title]" - common movie entry format
        /^(?:Watch|Watching|Watched|See|Saw|Stream|Streaming)\s+["']?([^"'\-–—]+?)["']?(?:\s*[-–—]|$)/i,
        // "[Title] movie" or "[Title] film"
        /^["']?([^"'\-–—]+?)["']?\s+(?:movie|film)(?:\s|$)/i,
        // Quoted title: "Title"
        /^["']([^"']+)["']/,
        // Title - description
        /^([^-–—]+?)\s*[-–—]\s*.+(?:movie|film|watch|stream|theater|cinema)/i,
        // Title followed by year in parentheses: "Title (2024)"
        /^["']?([^"'(]+?)["']?\s*\(\d{4}\)/,
      ];

      for (const pattern of moviePatterns) {
        const match = text.match(pattern);
        if (match) {
          const extractedTitle = match[1]?.trim().replace(/^["']|["']$/g, '');
          if (extractedTitle && extractedTitle.length > 1) {
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
        // Read "Title" by Author
        /^(?:Read|Reading|Finished|Started)\s+["']?([^"'-]+?)["']?\s+by\s+([A-Z][a-zA-Z\s.'-]+?)(?:\s*[-–—]|$)/i,
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

      // Fallback for books: use first part before dash as title
      const dashSplit = text.split(/\s*[-–—]\s*/);
      if (dashSplit.length > 0 && dashSplit[0].length > 2) {
        const title = dashSplit[0].trim().replace(/^["']|["']$/g, '').replace(/^(?:Read|Reading|Finished|Started)\s+/i, '');
        console.log(`[JOURNAL_WEB_ENRICH] Book fallback extraction: title="${title}"`);
        return { venueName: title, exactTitle: title, city: undefined, author: undefined };
      }
    }

    // MUSIC-specific extraction
    if (contentType === 'music') {
      const musicPatterns = [
        // "Listen to [Artist/Song]" 
        /^(?:Listen(?:ing)? to|Play(?:ing)?)\s+["']?([^"'\-–—]+?)["']?(?:\s*[-–—]|$)/i,
        // "[Artist] - [Album/Song]"
        /^["']?([^"'\-–—]+?)["']?\s*[-–—]\s*["']?([^"'\-–—]+?)["']?$/,
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
        // "[Exercise name] workout/exercise"
        /^["']?([^"'\-–—]+?)["']?\s+(?:workout|exercise|routine|training|pose)/i,
        // "Do [Exercise]"
        /^(?:Do|Try|Practice)\s+["']?([^"'\-–—]+?)["']?(?:\s*[-–—]|$)/i,
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

    return { venueName, city, author: undefined };
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
    // CRITICAL: Use quotes around exact title for precise matching
    // This prevents "Wicked for Good" from returning "Puppy Love" results
    let query = `"${venueName}"`;

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
    if (!this.tavilyClient) {
      console.warn('[JOURNAL_WEB_ENRICH] Tavily client not initialized');
      return { results: [], images: [] };
    }

    try {
      // Category-specific domain filtering for more precise results
      const domainFilters: Record<string, string[]> = {
        // RESTAURANTS: Focus on review sites
        restaurants: ['yelp.com', 'tripadvisor.com', 'opentable.com', 'google.com', 'foursquare.com'],
        'Restaurants & Food': ['yelp.com', 'tripadvisor.com', 'opentable.com', 'foursquare.com'],
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
        bars: ['yelp.com', 'tripadvisor.com', 'thrillist.com', 'timeout.com'],
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

      const response = await this.tavilyClient.search(query, searchOptions);

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
    category?: string
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
