/**
 * TMDB (The Movie Database) Service
 * 
 * Provides accurate movie/TV show data including official poster images.
 * FREE API with unlimited requests (requires API key from themoviedb.org)
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  runtime: number;
  genres: Array<{ id: number; name: string }>;
  credits?: {
    cast: Array<{ name: string; character: string; profile_path: string | null }>;
    crew: Array<{ name: string; job: string }>;
  };
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  original_language: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

export interface TMDBSearchResult {
  posterUrl: string | null;
  backdropUrl: string | null;
  title: string;
  overview: string;
  releaseYear: string;
  rating: number;
  ratingCount: number;
  genres: string[];
  director?: string;
  cast?: string[];
  runtime?: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
}

/**
 * Batch context for inferring characteristics of ambiguous items
 * from the majority of well-matched items in a batch.
 */
export interface BatchContext {
  inferredYear: number | null;
  inferredYearRange: { min: number; max: number } | null;
  inferredLanguage: string | null;
  inferredMediaType: 'movie' | 'tv' | null;
  inferredGenre: string | null;
  inferredRegion: string | null; // "US", "UK", "Korea", etc.
  collectionDescription: string | null; // AI-generated description of what the collection is
  isUpcoming: boolean;
  isClassic: boolean;
  confidence: number; // 0-1 based on how many items agreed
}

class TMDBService {
  private apiKey: string | null = null;

  // Minimum similarity threshold for accepting a TMDB result
  // 0.6 = at least 60% of query words must match the result title
  // Increased from 0.4 to prevent "The Pitt" matching "Pittsburgh Steelers"
  private readonly SIMILARITY_THRESHOLD = 0.6;

  // Current batch context for collective inference
  private batchContext: BatchContext | null = null;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || null;
    if (this.apiKey) {
      console.log('[TMDB] Service initialized with API key');
    } else {
      console.warn('[TMDB] No API key configured - movie enrichment will fall back to Tavily');
    }
  }

  /**
   * AI-POWERED BATCH CONTEXT INFERENCE
   *
   * Step 1: Use AI to semantically understand WHAT the collection represents
   * Step 2: Use that context to constrain TMDB searches
   *
   * Example:
   *   Input: ["Wicked Part Two", "Mission Impossible 8", "Eternity", "The Secret Agent"]
   *   AI Output: "These are 2025-2026 upcoming US theatrical releases"
   *   Context: { yearRange: {min: 2025, max: 2026}, region: "US", mediaType: "movie", isUpcoming: true }
   */
  async analyzeBatchContext(titles: string[]): Promise<BatchContext> {
    console.log(`[TMDB] AI-powered batch context inference for ${titles.length} items...`);

    // For single items, skip batch analysis
    if (titles.length <= 1) {
      this.batchContext = this.getEmptyBatchContext();
      return this.batchContext;
    }

    try {
      // Use AI to understand what the collection represents
      const aiContext = await this.inferCollectionContextWithAI(titles);

      if (aiContext) {
        this.batchContext = aiContext;
        console.log(`[TMDB] AI inferred: "${aiContext.collectionDescription}" - year=${aiContext.inferredYear || aiContext.inferredYearRange?.min + '-' + aiContext.inferredYearRange?.max}, region=${aiContext.inferredRegion}, type=${aiContext.inferredMediaType}, genre=${aiContext.inferredGenre}`);
        return this.batchContext;
      }
    } catch (error) {
      console.warn('[TMDB] AI batch inference failed, falling back to statistical analysis:', error);
    }

    // Fallback: Statistical analysis if AI fails
    return await this.analyzeStatisticalBatchContext(titles);
  }

  /**
   * Use AI (Claude Haiku) to semantically understand WHAT the collection represents.
   * This is the FIRST step before any TMDB searches.
   */
  private async inferCollectionContextWithAI(titles: string[]): Promise<BatchContext | null> {
    // Check if Anthropic API is available
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      console.log('[TMDB] No Anthropic API key, skipping AI inference');
      return null;
    }

    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: anthropicKey });

      const currentYear = new Date().getFullYear();
      const titlesPreview = titles.slice(0, 15).join('\n- ');

      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Analyze this list of titles and determine what they have in common. What category/type of content is this collection?

Titles:
- ${titlesPreview}

Current year: ${currentYear}

Respond ONLY with valid JSON (no explanation):
{
  "collectionDescription": "brief description of what this collection is, e.g., '2025-2026 upcoming US blockbuster movies' or 'classic 1990s action films' or 'Korean drama TV series'",
  "mediaType": "movie" | "tv" | "mixed" | null,
  "yearRange": { "min": number, "max": number } | null,
  "primaryYear": number | null,
  "language": "en" | "ko" | "ja" | "es" | "fr" | null,
  "region": "US" | "UK" | "Korea" | "Japan" | "France" | "International" | null,
  "genre": "action" | "drama" | "comedy" | "thriller" | "horror" | "sci-fi" | "romance" | "animation" | "documentary" | "mixed" | null,
  "isUpcoming": boolean,
  "isClassic": boolean,
  "confidence": 0.0-1.0
}`
        }]
      });

      const textContent = response.content[0];
      if (textContent.type !== 'text') return null;

      // Parse AI response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        inferredYear: parsed.primaryYear || null,
        inferredYearRange: parsed.yearRange || null,
        inferredLanguage: parsed.language || null,
        inferredMediaType: parsed.mediaType === 'mixed' ? null : parsed.mediaType,
        inferredGenre: parsed.genre === 'mixed' ? null : parsed.genre,
        inferredRegion: parsed.region || null,
        collectionDescription: parsed.collectionDescription || null,
        isUpcoming: parsed.isUpcoming || false,
        isClassic: parsed.isClassic || false,
        confidence: parsed.confidence || 0.7
      };

    } catch (error) {
      console.error('[TMDB] AI inference error:', error);
      return null;
    }
  }

  /**
   * Fallback: Statistical analysis when AI is unavailable.
   * Searches TMDB for each title and counts patterns.
   */
  private async analyzeStatisticalBatchContext(titles: string[]): Promise<BatchContext> {
    console.log(`[TMDB] Statistical batch context analysis for ${titles.length} items...`);

    const yearCounts = new Map<number, number>();
    const langCounts = new Map<string, number>();
    const mediaTypeCounts = { movie: 0, tv: 0 };
    let analyzedCount = 0;

    // Quick search each title to gather context
    for (const title of titles.slice(0, 10)) { // Limit for performance
      try {
        const { title: cleanTitle, year } = this.extractYearFromQuery(title);

        if (year) {
          yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
        }

        const movieUrl = `${TMDB_BASE_URL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(cleanTitle)}&include_adult=false&language=en-US&page=1`;
        const movieResp = await fetch(movieUrl);
        const movieData = await movieResp.json();

        if (movieData.results?.length > 0) {
          const top = movieData.results[0];
          const titleSim = this.calculateTitleSimilarity(cleanTitle, top.title);

          if (titleSim >= 0.7) {
            analyzedCount++;
            mediaTypeCounts.movie++;

            if (top.original_language) {
              langCounts.set(top.original_language, (langCounts.get(top.original_language) || 0) + 1);
            }

            if (top.release_date) {
              const movieYear = parseInt(top.release_date.substring(0, 4), 10);
              yearCounts.set(movieYear, (yearCounts.get(movieYear) || 0) + 1);
            }
          }
        } else {
          // Try TV
          const tvUrl = `${TMDB_BASE_URL}/search/tv?api_key=${this.apiKey}&query=${encodeURIComponent(cleanTitle)}&include_adult=false&language=en-US&page=1`;
          const tvResp = await fetch(tvUrl);
          const tvData = await tvResp.json();

          if (tvData.results?.length > 0) {
            const top = tvData.results[0];
            const titleSim = this.calculateTitleSimilarity(cleanTitle, top.name);

            if (titleSim >= 0.7) {
              analyzedCount++;
              mediaTypeCounts.tv++;

              if (top.original_language) {
                langCounts.set(top.original_language, (langCounts.get(top.original_language) || 0) + 1);
              }

              if (top.first_air_date) {
                const showYear = parseInt(top.first_air_date.substring(0, 4), 10);
                yearCounts.set(showYear, (yearCounts.get(showYear) || 0) + 1);
              }
            }
          }
        }
      } catch (e) {
        // Skip on error
      }
    }

    // Find most common year
    let inferredYear: number | null = null;
    let maxYearCount = 0;
    for (const [year, count] of yearCounts) {
      if (count > maxYearCount) {
        maxYearCount = count;
        inferredYear = year;
      }
    }
    if (maxYearCount < analyzedCount * 0.5) {
      inferredYear = null;
    }

    // Find year range
    const years = Array.from(yearCounts.keys()).sort();
    const inferredYearRange = years.length >= 2
      ? { min: years[0], max: years[years.length - 1] }
      : inferredYear ? { min: inferredYear, max: inferredYear } : null;

    // Find most common language
    let inferredLanguage: string | null = null;
    let maxLangCount = 0;
    for (const [lang, count] of langCounts) {
      if (count > maxLangCount) {
        maxLangCount = count;
        inferredLanguage = lang;
      }
    }
    if (maxLangCount < analyzedCount * 0.6) {
      inferredLanguage = null;
    }

    // Infer media type
    let inferredMediaType: 'movie' | 'tv' | null = null;
    if (mediaTypeCounts.movie > mediaTypeCounts.tv && mediaTypeCounts.movie > analyzedCount * 0.6) {
      inferredMediaType = 'movie';
    } else if (mediaTypeCounts.tv > mediaTypeCounts.movie && mediaTypeCounts.tv > analyzedCount * 0.6) {
      inferredMediaType = 'tv';
    }

    const confidence = analyzedCount > 0 ? Math.min(analyzedCount / titles.length, 1) : 0;
    const currentYear = new Date().getFullYear();

    this.batchContext = {
      inferredYear,
      inferredYearRange,
      inferredLanguage,
      inferredMediaType,
      inferredGenre: null, // Statistical analysis can't infer genre
      inferredRegion: inferredLanguage === 'en' ? 'US' : null,
      collectionDescription: inferredMediaType
        ? `${inferredYear || 'various'} ${inferredLanguage === 'en' ? 'English' : ''} ${inferredMediaType}s`
        : null,
      isUpcoming: inferredYear ? inferredYear >= currentYear : false,
      isClassic: inferredYear ? inferredYear < currentYear - 20 : false,
      confidence
    };

    console.log(`[TMDB] Statistical context: year=${inferredYear}, range=${inferredYearRange?.min}-${inferredYearRange?.max}, lang=${inferredLanguage}, type=${inferredMediaType}, confidence=${(confidence * 100).toFixed(0)}%`);

    return this.batchContext;
  }

  /**
   * Get empty batch context for single-item searches.
   */
  private getEmptyBatchContext(): BatchContext {
    return {
      inferredYear: null,
      inferredYearRange: null,
      inferredLanguage: null,
      inferredMediaType: null,
      inferredGenre: null,
      inferredRegion: null,
      collectionDescription: null,
      isUpcoming: false,
      isClassic: false,
      confidence: 0
    };
  }

  /**
   * Clear batch context after processing is complete.
   */
  clearBatchContext(): void {
    this.batchContext = null;
    console.log('[TMDB] Batch context cleared');
  }

  /**
   * Get current batch context for use in scoring.
   */
  getBatchContext(): BatchContext | null {
    return this.batchContext;
  }

  /**
   * Search multiple titles with automatic batch context inference.
   * This is the recommended method for searching lists of movies/shows.
   *
   * Example usage:
   *   const titles = ["Wicked Part Two", "Eternity", "The Secret Agent", "Mission Impossible 8"];
   *   const results = await tmdbService.searchBatch(titles);
   *
   * The batch context will be inferred from clear matches (like "Wicked Part Two")
   * and used to help resolve ambiguous titles (like "Eternity").
   */
  async searchBatch(titles: string[]): Promise<Map<string, TMDBSearchResult | null>> {
    console.log(`[TMDB] Starting batch search for ${titles.length} titles...`);

    // Step 1: Analyze batch context from all titles
    await this.analyzeBatchContext(titles);

    // Step 2: Search each title with batch context active
    const results = new Map<string, TMDBSearchResult | null>();

    for (const title of titles) {
      try {
        const result = await this.searchMovie(title);
        results.set(title, result);
      } catch (e) {
        console.error(`[TMDB] Batch search error for "${title}":`, e);
        results.set(title, null);
      }
    }

    // Step 3: Clear batch context
    this.clearBatchContext();

    console.log(`[TMDB] Batch search complete: ${results.size} results`);
    return results;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private getImageUrl(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  /**
   * Extract year from a query string (e.g., "The Pitt 2025", "Movie (2024)")
   * Returns { title: cleanTitle, year: extractedYear }
   */
  private extractYearFromQuery(query: string): { title: string; year: number | null } {
    // Match year patterns: (2025), [2025], 2025, - 2025
    const yearPatterns = [
      /\((\d{4})\)\s*$/,          // "Movie Title (2025)"
      /\[(\d{4})\]\s*$/,          // "Movie Title [2025]"
      /\s+-\s+(\d{4})\s*$/,       // "Movie Title - 2025"
      /\s+(\d{4})\s*$/,           // "Movie Title 2025"
      /\b(20\d{2}|19\d{2})\b/,    // Any 4-digit year in text
    ];

    for (const pattern of yearPatterns) {
      const match = query.match(pattern);
      if (match) {
        const year = parseInt(match[1], 10);
        // Validate year is reasonable (1900-2030)
        if (year >= 1900 && year <= 2030) {
          // Remove year from title
          const title = query.replace(pattern, '').trim();
          console.log(`[TMDB] Extracted year ${year} from query, clean title: "${title}"`);
          return { title, year };
        }
      }
    }

    return { title: query, year: null };
  }

  /**
   * Calculate Levenshtein distance between two strings.
   * Returns the minimum number of single-character edits needed to transform one string into another.
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Calculate smart similarity score using multiple signals.
   * Returns a score 0-1 where 1 = perfect match.
   *
   * Uses dynamic inference instead of hardcoded aliases:
   * - Levenshtein distance for fuzzy matching
   * - Word-level analysis with smart stemming
   * - Position-aware word matching
   * - Dynamic threshold based on query length
   */
  private calculateTitleSimilarity(query: string, resultTitle: string): number {
    // Normalize: lowercase, expand common contractions, remove punctuation
    const normalize = (s: string) => s.toLowerCase()
      .replace(/['']s\b/g, '')           // Remove possessives
      .replace(/[-–—]/g, ' ')            // Dashes to spaces (for "Rent-a-Girlfriend" → "Rent a Girlfriend")
      .replace(/[^a-z0-9\s]/g, '')       // Remove other punctuation
      .replace(/\s+/g, ' ')              // Collapse whitespace
      .trim();

    const normalizedQuery = normalize(query);
    const normalizedResult = normalize(resultTitle);

    // === SIGNAL 1: Exact match (highest confidence) ===
    if (normalizedQuery === normalizedResult) {
      return 1.0;
    }

    // === SIGNAL 2: Levenshtein-based similarity ===
    const maxLen = Math.max(normalizedQuery.length, normalizedResult.length);
    const levDistance = this.levenshteinDistance(normalizedQuery, normalizedResult);
    const levSimilarity = maxLen > 0 ? 1 - (levDistance / maxLen) : 0;

    // === SIGNAL 3: Word-based analysis ===
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 1);
    const resultWords = normalizedResult.split(' ').filter(w => w.length > 1);

    if (queryWords.length === 0) return 0;

    // Count exact word matches
    let exactWordMatches = 0;
    let fuzzyWordMatches = 0;
    const matchedResultIndices = new Set<number>();

    for (const qWord of queryWords) {
      let bestMatchScore = 0;
      let bestMatchIdx = -1;

      for (let i = 0; i < resultWords.length; i++) {
        if (matchedResultIndices.has(i)) continue;

        const rWord = resultWords[i];

        // Exact match
        if (qWord === rWord) {
          bestMatchScore = 1.0;
          bestMatchIdx = i;
          break;
        }

        // Fuzzy word match using Levenshtein
        const wordMaxLen = Math.max(qWord.length, rWord.length);
        const wordLev = this.levenshteinDistance(qWord, rWord);
        const wordSim = 1 - (wordLev / wordMaxLen);

        // Only consider if >= 70% similar (allows "rental" vs "rent" but not "rental" vs "girlfriend")
        if (wordSim >= 0.7 && wordSim > bestMatchScore) {
          bestMatchScore = wordSim;
          bestMatchIdx = i;
        }
      }

      if (bestMatchIdx >= 0) {
        matchedResultIndices.add(bestMatchIdx);
        if (bestMatchScore === 1.0) {
          exactWordMatches++;
        } else {
          fuzzyWordMatches += bestMatchScore;
        }
      }
    }

    const wordMatchRatio = (exactWordMatches + fuzzyWordMatches * 0.7) / queryWords.length;

    // === SIGNAL 4: Length/structure analysis ===
    const wordCountDiff = Math.abs(resultWords.length - queryWords.length);
    const lengthPenalty = wordCountDiff > 2 ? 0.15 * (wordCountDiff - 2) : 0;

    // === SIGNAL 5: Order-aware matching (words in same order?) ===
    let orderBonus = 0;
    if (exactWordMatches >= 2) {
      // Check if matched words appear in similar order
      const queryPositions = queryWords.map((w, i) => resultWords.indexOf(w) >= 0 ? i : -1).filter(p => p >= 0);
      const resultPositions = queryWords.map(w => resultWords.indexOf(w)).filter(p => p >= 0);

      // If positions are monotonically increasing, words are in order
      let inOrder = true;
      for (let i = 1; i < resultPositions.length; i++) {
        if (resultPositions[i] < resultPositions[i - 1]) {
          inOrder = false;
          break;
        }
      }
      if (inOrder && resultPositions.length >= 2) {
        orderBonus = 0.1;
      }
    }

    // === Combine signals with dynamic weighting ===
    // Short queries (1-2 words) need stricter matching
    const isShortQuery = queryWords.length <= 2;

    let score: number;
    if (isShortQuery) {
      // For short queries, heavily weight exact matches
      // "Eternity" should NOT match "Eternity in the Universe"
      if (resultWords.length > queryWords.length + 1 && exactWordMatches < queryWords.length) {
        // Result has too many extra words and not all query words matched exactly
        console.log(`[TMDB] Short query "${query}" - rejecting "${resultTitle}" (extra words, inexact match)`);
        return 0.3;
      }
      // Weight: 60% word match, 30% Levenshtein, 10% structure
      score = (wordMatchRatio * 0.6) + (levSimilarity * 0.3) + orderBonus - lengthPenalty;
    } else {
      // For longer queries, balance word match and fuzzy match
      // Weight: 50% word match, 35% Levenshtein, 15% structure
      score = (wordMatchRatio * 0.5) + (levSimilarity * 0.35) + orderBonus - lengthPenalty;
    }

    // === Final strict checks ===
    // If less than half the query words matched exactly, apply penalty
    if (exactWordMatches < queryWords.length / 2) {
      score -= 0.15;
      console.log(`[TMDB] Penalty: only ${exactWordMatches}/${queryWords.length} exact word matches for "${resultTitle}"`);
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Detect if query is clearly about a TV show (contains "Season X", "Episode X", "series", etc.)
   */
  private isTVShowQuery(query: string): boolean {
    const tvPatterns = [
      /season\s*\d+/i,           // "Season 4", "season 1"
      /\bS\d{1,2}\b/i,           // "S04", "S1"
      /episode\s*\d+/i,          // "Episode 5"
      /\bE\d{1,2}\b/i,           // "E05"
      /\bseries\b/i,             // "series"
      /\bTV\s*show\b/i,          // "TV show"
      /\bpremier(e|ing)\b/i,     // "premiering"
      /\bHBO\b/i,                // HBO (usually TV)
      /\bNetflix\b/i,            // Netflix (usually TV)
      /\bDisney\+?\b/i,          // Disney+
      /\bParamount\+?\b/i,       // Paramount+
      /\bApple\s*TV\+?\b/i,      // Apple TV+
      /\bAmazon\s*Prime\b/i,     // Amazon Prime
      /\bHulu\b/i,               // Hulu
      /\bMax\b/i,                // Max (HBO Max)
    ];
    return tvPatterns.some(p => p.test(query));
  }

  /**
   * Extract the core show/movie name by removing season/episode info and service names
   */
  private extractCoreName(query: string): string {
    return query
      .replace(/\s*[-–—]\s*.*$/i, '')              // Remove everything after dash
      .replace(/\s*season\s*\d+.*$/i, '')          // Remove "Season X" and after
      .replace(/\s*S\d{1,2}E?\d*.*$/i, '')         // Remove "S04E01" and after
      .replace(/\s*episode\s*\d+.*$/i, '')         // Remove "Episode X" and after
      .replace(/\s*\(.*\)\s*$/i, '')               // Remove parenthetical info
      .replace(/\s*(HBO|Netflix|Disney\+?|Paramount\+?|Apple\s*TV\+?|Amazon|Hulu|Max)\s*/gi, '') // Remove service names
      .replace(/\s*(series|show|TV)\s*/gi, '')     // Remove generic terms
      .replace(/\s*(premiering|premiere|TBA)\s*/gi, '') // Remove premiere info
      .replace(/\s+/g, ' ')                        // Collapse whitespace
      .trim();
  }

  async searchMovie(query: string): Promise<TMDBSearchResult | null> {
    if (!this.apiKey) {
      console.warn('[TMDB] Cannot search - no API key configured');
      return null;
    }

    try {
      // CRITICAL: If query looks like a TV show, skip movie search entirely
      if (this.isTVShowQuery(query)) {
        console.log(`[TMDB] Query "${query}" looks like a TV show - skipping movie search`);
        const coreName = this.extractCoreName(query);
        return await this.searchTV(coreName, null);
      }

      const cleanQuery = this.extractMovieTitle(query);

      // Extract year from query for more accurate matching
      const { title: titleWithoutYear, year: extractedYear } = this.extractYearFromQuery(cleanQuery);
      console.log(`[TMDB] Searching for movie: "${titleWithoutYear}"${extractedYear ? ` (year: ${extractedYear})` : ''}`);

      // Try primary search with year if available
      let result = await this.searchMovieByTitle(titleWithoutYear, extractedYear);

      // If no result and the query was transformed, try original title too
      if (!result && titleWithoutYear !== query) {
        const originalTitle = query.replace(/^watch\s+/i, '').replace(/^find\s+and\s+watch\s+/i, '').trim();
        const { title: origWithoutYear, year: origYear } = this.extractYearFromQuery(originalTitle);
        if (origWithoutYear !== titleWithoutYear) {
          console.log(`[TMDB] Trying fallback search with original: "${origWithoutYear}"`);
          result = await this.searchMovieByTitle(origWithoutYear, origYear || extractedYear);
        }
      }

      // If still no result, try without year constraint
      if (!result && extractedYear) {
        console.log(`[TMDB] Trying search without year constraint: "${titleWithoutYear}"`);
        result = await this.searchMovieByTitle(titleWithoutYear, null);
      }

      return result;
    } catch (error) {
      console.error('[TMDB] Search error:', error);
      return null;
    }
  }

  private async searchMovieByTitle(cleanQuery: string, targetYear: number | null = null): Promise<TMDBSearchResult | null> {
    try {
      // Build URL with year filter if available
      let url = `${TMDB_BASE_URL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(cleanQuery)}&include_adult=false&language=en-US`;
      if (targetYear) {
        // Use primary_release_year for exact year matching
        url += `&primary_release_year=${targetYear}`;
      }

      console.log(`[TMDB] Movie search: "${cleanQuery}"${targetYear ? ` year=${targetYear}` : ''}`);
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[TMDB] Search failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        console.log(`[TMDB] No movies found for: "${cleanQuery}"`);
        // DON'T automatically fall back to TV - return null instead
        // This prevents "Rental Family" → "Rent-a-Girlfriend" wrong matches
        return null;
      }

      // SMART MULTI-SIGNAL SCORING with context inference
      let bestMatch: TMDBMovie | null = null;
      let bestScore = 0;

      // Check top 10 results for best match using multiple signals
      for (const movie of data.results.slice(0, 10) as TMDBMovie[]) {
        // === SIGNAL 1: Title similarity (primary) ===
        let score = this.calculateTitleSimilarity(cleanQuery, movie.title);
        const movieYear = movie.release_date ? parseInt(movie.release_date.substring(0, 4), 10) : null;
        const signals: string[] = [];

        // Also check original_title if different (e.g., foreign films with English release titles)
        if (movie.original_title && movie.original_title !== movie.title) {
          const originalScore = this.calculateTitleSimilarity(cleanQuery, movie.original_title);
          if (originalScore > score) {
            score = originalScore;
            signals.push('matched original_title');
          }
        }

        // === SIGNAL 2: Year matching ===
        if (targetYear && movieYear) {
          if (movieYear === targetYear) {
            score += 0.2;
            signals.push('year match');
          } else if (Math.abs(movieYear - targetYear) <= 1) {
            score += 0.1;
            signals.push('year close');
          } else {
            score -= 0.15;
            signals.push(`year mismatch: wanted ${targetYear}`);
          }
        }

        // === SIGNAL 3: Language context inference ===
        // For English searches, prefer English-original content
        // This prevents "The Secret Agent" matching Russian films
        if (movie.original_language === 'en') {
          score += 0.1;
          signals.push('English original');
        } else if (movie.original_language && movie.original_language !== 'en') {
          // Foreign language content - penalize unless title is exact match
          const titleExact = cleanQuery.toLowerCase().trim() === movie.title.toLowerCase().trim();
          if (!titleExact) {
            score -= 0.15;
            signals.push(`foreign (${movie.original_language})`);
          }
        }

        // === SIGNAL 4: Popularity context inference ===
        // More popular content is more likely what user is searching for
        if (movie.popularity > 50) {
          score += 0.1;
          signals.push('high popularity');
        } else if (movie.popularity > 20) {
          score += 0.05;
          signals.push('moderate popularity');
        } else if (movie.popularity < 5) {
          score -= 0.05;
          signals.push('low popularity');
        }

        // === SIGNAL 5: Vote count (audience engagement) ===
        if (movie.vote_count > 1000) {
          score += 0.05;
          signals.push('high engagement');
        } else if (movie.vote_count < 10) {
          score -= 0.1;
          signals.push('minimal engagement');
        }

        // === SIGNAL 6: AI-Powered Batch Context Inference ===
        // Use the rich context inferred from the collection (year range, region, genre, etc.)
        const ctx = this.batchContext;
        if (ctx && ctx.confidence > 0.5) {
          // Year range inference (e.g., "2025-2026 upcoming movies")
          if (movieYear && ctx.inferredYearRange) {
            const { min, max } = ctx.inferredYearRange;
            if (movieYear >= min && movieYear <= max) {
              score += 0.2;
              signals.push(`batch year range match (${min}-${max})`);
            } else if (movieYear < min - 2 || movieYear > max + 2) {
              score -= 0.15;
              signals.push(`batch year range mismatch`);
            }
          } else if (!targetYear && ctx.inferredYear && movieYear) {
            // Fallback to single year if no range
            if (movieYear === ctx.inferredYear) {
              score += 0.15;
              signals.push(`batch year match (${ctx.inferredYear})`);
            } else if (Math.abs(movieYear - ctx.inferredYear) > 2) {
              score -= 0.1;
              signals.push(`batch year mismatch`);
            }
          }

          // Upcoming content bonus (if batch is upcoming releases)
          if (ctx.isUpcoming && movieYear) {
            const currentYear = new Date().getFullYear();
            if (movieYear >= currentYear) {
              score += 0.1;
              signals.push('upcoming release');
            } else if (movieYear < currentYear - 1) {
              score -= 0.1;
              signals.push('not upcoming');
            }
          }

          // Region/Language inference
          if (ctx.inferredLanguage && movie.original_language) {
            if (movie.original_language === ctx.inferredLanguage) {
              score += 0.1;
              signals.push(`batch lang match (${ctx.inferredLanguage})`);
            } else if (ctx.inferredLanguage === 'en' && movie.original_language !== 'en') {
              score -= 0.15;
              signals.push('batch expects English');
            }
          }

          // Region inference (US, UK, Korea, etc.)
          if (ctx.inferredRegion === 'US' && movie.original_language !== 'en') {
            score -= 0.1;
            signals.push('batch expects US content');
          } else if (ctx.inferredRegion === 'Korea' && movie.original_language !== 'ko') {
            score -= 0.1;
            signals.push('batch expects Korean content');
          }

          // Collection description logging for debugging
          if (ctx.collectionDescription) {
            signals.push(`ctx: "${ctx.collectionDescription}"`);
          }
        }

        console.log(`[TMDB] Title match: "${movie.title}" (${movieYear || '?'}) = ${(score * 100).toFixed(0)}% [${signals.join(', ')}]`);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = movie;
        }

        // Perfect or near-perfect match - stop searching
        if (score >= 1.0) break;
      }

      // Reject if no result meets the similarity threshold
      // DO NOT fall back to TV automatically - this caused wrong matches
      // TV search should only happen when explicitly detected as TV content
      if (!bestMatch || bestScore < this.SIMILARITY_THRESHOLD) {
        console.log(`[TMDB] No good movie match for "${cleanQuery}" (best score: ${(bestScore * 100).toFixed(0)}%, threshold: ${this.SIMILARITY_THRESHOLD * 100}%)`);
        return null;
      }

      console.log(`[TMDB] Best match: "${bestMatch.title}" (${bestMatch.release_date?.substring(0, 4)}) with ${(bestScore * 100).toFixed(0)}% similarity`);

      const details = await this.getMovieDetails(bestMatch.id);

      // PRIORITY: Use BACKDROP (landscape) images for better display on cards
      // Fetch English backdrop from images endpoint for best quality
      let backdropPath = await this.getEnglishBackdrop(bestMatch.id, 'movie');
      if (!backdropPath) {
        backdropPath = bestMatch.backdrop_path || details?.backdrop_path || null;
      }

      // Poster as fallback
      let posterPath = bestMatch.poster_path || details?.poster_path;
      if (!posterPath) {
        posterPath = await this.getMovieImages(bestMatch.id);
      }

      // Primary image is now BACKDROP (landscape), with poster as fallback
      const backdropUrl = this.getImageUrl(backdropPath, 'w780') || this.getImageUrl(backdropPath, 'original');
      const posterUrl = this.getImageUrl(posterPath, 'w500');

      if (!backdropUrl && !posterUrl) {
        console.log(`[TMDB] WARNING: No backdrop or poster found for "${bestMatch.title}"`);
      } else {
        console.log(`[TMDB] Got images for "${bestMatch.title}": backdrop=${backdropUrl ? 'yes' : 'no'}, poster=${posterUrl ? 'yes' : 'no'}`);
      }

      return {
        // Return backdrop as primary for landscape display
        posterUrl: backdropUrl || posterUrl,
        backdropUrl: backdropUrl,
        title: bestMatch.title,
        overview: bestMatch.overview,
        releaseYear: bestMatch.release_date?.substring(0, 4) || '',
        rating: Math.round(bestMatch.vote_average * 10) / 10,
        ratingCount: bestMatch.vote_count,
        genres: details?.genres?.map(g => g.name) || [],
        director: details?.credits?.crew?.find(c => c.job === 'Director')?.name,
        cast: details?.credits?.cast?.slice(0, 5).map(c => c.name),
        runtime: details?.runtime ? `${details.runtime} min` : undefined,
        tmdbId: bestMatch.id,
        mediaType: 'movie'
      };
    } catch (error) {
      console.error('[TMDB] Search error:', error);
      return null;
    }
  }

  async searchTV(query: string, targetYear: number | null = null): Promise<TMDBSearchResult | null> {
    if (!this.apiKey) return null;

    try {
      const cleanQuery = this.extractMovieTitle(query);

      // Extract year if not provided
      let searchYear = targetYear;
      let searchTitle = cleanQuery;
      if (!searchYear) {
        const { title, year } = this.extractYearFromQuery(cleanQuery);
        searchTitle = title;
        searchYear = year;
      }

      // Count words in search title for stricter matching on short queries
      const wordCount = searchTitle.split(/\s+/).filter(w => w.length > 1).length;
      const isShortTitle = wordCount <= 2;

      console.log(`[TMDB] Searching for TV show: "${searchTitle}"${searchYear ? ` (year: ${searchYear})` : ''} (${wordCount} words)`);

      // Build URL - always use language=en-US for English content
      let url = `${TMDB_BASE_URL}/search/tv?api_key=${this.apiKey}&query=${encodeURIComponent(searchTitle)}&include_adult=false&language=en-US`;
      if (searchYear) {
        url += `&first_air_date_year=${searchYear}`;
      }

      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        console.log(`[TMDB] No TV shows found for: "${searchTitle}"`);
        return null;
      }

      // SMART MULTI-SIGNAL SCORING with context inference for TV
      let bestMatch: TMDBTVShow | null = null;
      let bestScore = 0;

      for (const show of data.results.slice(0, 15) as TMDBTVShow[]) {
        // === SIGNAL 1: Title similarity (primary) ===
        let score = this.calculateTitleSimilarity(searchTitle, show.name);
        const showYear = show.first_air_date ? parseInt(show.first_air_date.substring(0, 4), 10) : null;
        const signals: string[] = [];

        // Also check original_name if different
        if (show.original_name && show.original_name !== show.name) {
          const originalScore = this.calculateTitleSimilarity(searchTitle, show.original_name);
          if (originalScore > score) {
            score = originalScore;
            signals.push('matched original_name');
          }
        }

        // For short titles (1-2 words), require stricter matching
        if (isShortTitle) {
          const normalizedSearch = searchTitle.toLowerCase().trim();
          const normalizedShow = show.name.toLowerCase().trim();
          if (normalizedSearch !== normalizedShow) {
            score -= 0.3;
            signals.push('short title mismatch');
            if (score < 0.5) continue;
          }
        }

        // === SIGNAL 2: Year matching ===
        if (searchYear && showYear) {
          if (showYear === searchYear) {
            score += 0.25;
            signals.push('year match');
          } else if (Math.abs(showYear - searchYear) <= 1) {
            score += 0.1;
            signals.push('year close');
          } else {
            score -= 0.2;
            signals.push(`year mismatch: wanted ${searchYear}`);
          }
        } else if (showYear) {
          // No target year - prefer recent content
          if (showYear >= 2015) {
            score += 0.15;
            signals.push('recent content');
          } else if (showYear < 2000) {
            score -= 0.25;
            signals.push('old content');
          }
        }

        // === SIGNAL 3: Language context inference ===
        if (show.original_language === 'en') {
          score += 0.1;
          signals.push('English original');
        } else if (show.original_language && show.original_language !== 'en') {
          const titleExact = searchTitle.toLowerCase().trim() === show.name.toLowerCase().trim();
          if (!titleExact) {
            score -= 0.15;
            signals.push(`foreign (${show.original_language})`);
          }
        }

        // === SIGNAL 4: Popularity context inference ===
        if (show.popularity > 50) {
          score += 0.1;
          signals.push('high popularity');
        } else if (show.popularity > 20) {
          score += 0.05;
          signals.push('moderate popularity');
        } else if (show.popularity < 5) {
          score -= 0.05;
          signals.push('low popularity');
        }

        // === SIGNAL 5: Vote count (audience engagement) ===
        if (show.vote_count > 500) {
          score += 0.1;
          signals.push('high engagement');
        } else if (show.vote_count > 100) {
          score += 0.05;
          signals.push('moderate engagement');
        } else if (show.vote_count < 10) {
          score -= 0.1;
          signals.push('minimal engagement');
        }

        // === SIGNAL 6: AI-Powered Batch Context Inference ===
        const ctx = this.batchContext;
        if (ctx && ctx.confidence > 0.5) {
          // Year range inference
          if (showYear && ctx.inferredYearRange) {
            const { min, max } = ctx.inferredYearRange;
            if (showYear >= min && showYear <= max) {
              score += 0.2;
              signals.push(`batch year range match (${min}-${max})`);
            } else if (showYear < min - 2 || showYear > max + 2) {
              score -= 0.15;
              signals.push('batch year range mismatch');
            }
          } else if (!searchYear && ctx.inferredYear && showYear) {
            if (showYear === ctx.inferredYear) {
              score += 0.15;
              signals.push(`batch year match (${ctx.inferredYear})`);
            } else if (Math.abs(showYear - ctx.inferredYear) > 2) {
              score -= 0.1;
              signals.push('batch year mismatch');
            }
          }

          // Upcoming content bonus
          if (ctx.isUpcoming && showYear) {
            const currentYear = new Date().getFullYear();
            if (showYear >= currentYear) {
              score += 0.1;
              signals.push('upcoming release');
            } else if (showYear < currentYear - 1) {
              score -= 0.1;
              signals.push('not upcoming');
            }
          }

          // Language inference
          if (ctx.inferredLanguage && show.original_language) {
            if (show.original_language === ctx.inferredLanguage) {
              score += 0.1;
              signals.push(`batch lang match (${ctx.inferredLanguage})`);
            } else if (ctx.inferredLanguage === 'en' && show.original_language !== 'en') {
              score -= 0.15;
              signals.push('batch expects English');
            }
          }

          // Region inference
          if (ctx.inferredRegion === 'US' && show.original_language !== 'en') {
            score -= 0.1;
            signals.push('batch expects US content');
          } else if (ctx.inferredRegion === 'Korea' && show.original_language !== 'ko') {
            score -= 0.1;
            signals.push('batch expects Korean content');
          }

          // Media type inference (prefer movies if batch is mostly movies)
          if (ctx.inferredMediaType === 'movie') {
            score -= 0.15;
            signals.push('batch prefers movies');
          }
        }

        console.log(`[TMDB] TV match: "${show.name}" (${showYear || '?'}) = ${(score * 100).toFixed(0)}% [${signals.join(', ')}]`);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = show;
        }

        // Perfect match - stop searching
        if (score >= 1.2) break;
      }

      // For short titles, require even higher threshold
      const effectiveThreshold = isShortTitle ? 0.75 : this.SIMILARITY_THRESHOLD;

      // Reject if no result meets threshold
      if (!bestMatch || bestScore < effectiveThreshold) {
        console.log(`[TMDB] No good TV match for "${searchTitle}" (best score: ${(bestScore * 100).toFixed(0)}%, threshold: ${(effectiveThreshold * 100).toFixed(0)}%)`);
        return null;
      }

      console.log(`[TMDB] Best TV match: "${bestMatch.name}" (${bestMatch.first_air_date?.substring(0, 4)}) with ${(bestScore * 100).toFixed(0)}% similarity`);

      // PRIORITY: Use BACKDROP (landscape) images for better display on cards
      let backdropPath = await this.getEnglishBackdrop(bestMatch.id, 'tv');
      if (!backdropPath) {
        backdropPath = bestMatch.backdrop_path;
      }

      const posterPath = bestMatch.poster_path;

      // Primary image is now BACKDROP (landscape), with poster as fallback
      const backdropUrl = this.getImageUrl(backdropPath, 'w780');
      const posterUrl = this.getImageUrl(posterPath, 'w500');

      return {
        // Return backdrop as primary for landscape display
        posterUrl: backdropUrl || posterUrl,
        backdropUrl: backdropUrl,
        title: bestMatch.name,
        overview: bestMatch.overview,
        releaseYear: bestMatch.first_air_date?.substring(0, 4) || '',
        rating: Math.round(bestMatch.vote_average * 10) / 10,
        ratingCount: bestMatch.vote_count,
        genres: [],
        tmdbId: bestMatch.id,
        mediaType: 'tv'
      };
    } catch (error) {
      console.error('[TMDB] TV search error:', error);
      return null;
    }
  }

  private async getMovieDetails(movieId: number): Promise<TMDBMovieDetails | null> {
    if (!this.apiKey) return null;

    try {
      // Always request English language results to avoid foreign-language posters
      const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${this.apiKey}&append_to_response=credits&language=en-US`;
      const response = await fetch(url);

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error('[TMDB] Get details error:', error);
      return null;
    }
  }

  /**
   * Fetch English backdrop image from the images endpoint.
   * Backdrops are landscape format - better for card displays.
   * Prioritizes English backdrops, then language-neutral backdrops.
   */
  private async getEnglishBackdrop(id: number, mediaType: 'movie' | 'tv'): Promise<string | null> {
    if (!this.apiKey) return null;

    try {
      const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
      // Request images with English language preference, with fallback to null (language-neutral)
      const url = `${TMDB_BASE_URL}/${endpoint}/${id}/images?api_key=${this.apiKey}&include_image_language=en,null`;
      const response = await fetch(url);

      if (!response.ok) return null;

      const data = await response.json();
      const backdrops = data.backdrops || [];

      if (backdrops.length === 0) {
        console.log(`[TMDB] No backdrops found for ${mediaType} ${id}`);
        return null;
      }

      // Sort by vote_average to get best quality backdrop
      const sortedBackdrops = backdrops.sort((a: { vote_average: number }, b: { vote_average: number }) =>
        (b.vote_average || 0) - (a.vote_average || 0)
      );

      // Prefer English backdrops, then language-neutral (null), then any
      const englishBackdrop = sortedBackdrops.find((b: { iso_639_1: string | null }) => b.iso_639_1 === 'en');
      const neutralBackdrop = sortedBackdrops.find((b: { iso_639_1: string | null }) => b.iso_639_1 === null);
      const bestBackdrop = englishBackdrop || neutralBackdrop || sortedBackdrops[0];

      if (bestBackdrop?.file_path) {
        console.log(`[TMDB] Found English/neutral backdrop for ${mediaType} ${id}: ${bestBackdrop.iso_639_1 || 'neutral'}`);
        return bestBackdrop.file_path;
      }

      return null;
    } catch (error) {
      console.error(`[TMDB] Get ${mediaType} backdrops error:`, error);
      return null;
    }
  }

  /**
   * Fetch movie images from the dedicated images endpoint.
   * This is useful when the search result has null poster_path but the movie has posters.
   */
  private async getMovieImages(movieId: number): Promise<string | null> {
    if (!this.apiKey) return null;

    try {
      // Request images with English language preference (include_image_language allows fallback to 'null' for language-neutral images)
      const url = `${TMDB_BASE_URL}/movie/${movieId}/images?api_key=${this.apiKey}&include_image_language=en,null`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      // Try to get the first English poster, or any poster
      const posters = data.posters || [];
      if (posters.length > 0) {
        // Prefer English posters, then any poster
        const englishPoster = posters.find((p: { iso_639_1: string }) => p.iso_639_1 === 'en');
        const posterPath = englishPoster?.file_path || posters[0]?.file_path;
        if (posterPath) {
          console.log(`[TMDB] Found poster from images endpoint for movie ${movieId}`);
          return posterPath;
        }
      }
      
      // Fall back to backdrops if no posters
      const backdrops = data.backdrops || [];
      if (backdrops.length > 0) {
        console.log(`[TMDB] Using backdrop from images endpoint for movie ${movieId}`);
        return backdrops[0]?.file_path || null;
      }
      
      return null;
    } catch (error) {
      console.error('[TMDB] Get images error:', error);
      return null;
    }
  }

  /**
   * Extract and clean movie title from user input.
   * NO hardcoded aliases - relies on smart matching algorithms instead.
   */
  private extractMovieTitle(text: string): string {
    let title = text;

    const watchPatterns = [
      /^watch\s+["']?(.+?)["']?\s*$/i,
      /^["'](.+?)["']\s*(?:movie|film)?$/i,
      /^(.+?)\s+(?:movie|film)\s*$/i,
      /^see\s+["']?(.+?)["']?\s*$/i,
      /^find\s+and\s+watch\s+["']?(.+?)["']?/i,
    ];

    for (const pattern of watchPatterns) {
      const match = title.match(pattern);
      if (match) {
        title = match[1].trim();
        break;
      }
    }

    title = title
      .replace(/\s*[-–—]\s*.*$/, '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/\s*\(estimated\s*\$[\d\-]+\s*rental?\)/i, '') // Remove price estimates
      .trim();

    return title || text;
  }
}

export const tmdbService = new TMDBService();
