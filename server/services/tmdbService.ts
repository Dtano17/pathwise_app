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

  // Base similarity threshold for accepting a TMDB result
  // 0.6 = at least 60% of query words must match the result title
  // Increased from 0.4 to prevent "The Pitt" matching "Pittsburgh Steelers"
  private readonly SIMILARITY_THRESHOLD = 0.6;

  // Major franchises that require higher similarity or popularity to prevent false positives
  // e.g., "Spider-Man: Brand New Day" should NOT match low-budget "Spider Man" knockoffs
  private readonly PROTECTED_FRANCHISES = [
    'spider-man', 'spiderman', 'spider man',
    'batman', 'superman', 'wonder woman',
    'marvel', 'avengers', 'iron man', 'captain america', 'thor',
    'star wars', 'star trek',
    'harry potter', 'lord of the rings', 'hobbit',
    'james bond', '007',
    'fast and furious', 'fast & furious',
    'jurassic park', 'jurassic world',
    'transformers', 'mission impossible',
    'indiana jones', 'pirates of the caribbean',
    'x-men', 'deadpool', 'wolverine',
    'dc', 'dceu', 'mcu'
  ];

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
   * Set batch context from external source (e.g., journalWebEnrichmentService).
   * This allows the tiered validation to use year/region context when searching.
   */
  setBatchContext(context: Partial<BatchContext>): void {
    this.batchContext = {
      inferredYear: context.inferredYear || null,
      inferredYearRange: context.inferredYearRange || null,
      inferredLanguage: context.inferredLanguage || null,
      inferredMediaType: context.inferredMediaType || null,
      inferredGenre: context.inferredGenre || null,
      inferredRegion: context.inferredRegion || null,
      collectionDescription: context.collectionDescription || null,
      isUpcoming: context.isUpcoming || false,
      isClassic: context.isClassic || false,
      confidence: context.confidence || 0.5
    };
    console.log(`[TMDB] Batch context set externally: year=${this.batchContext.inferredYear}, range=${this.batchContext.inferredYearRange?.min}-${this.batchContext.inferredYearRange?.max}, region=${this.batchContext.inferredRegion}, type=${this.batchContext.inferredMediaType}`);
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

  /**
   * Search for a movie on TMDB
   * @param query - The movie title to search for
   * @param yearHint - Optional year hint from batch context (e.g., "2024 movies" batch)
   *                   This helps filter results when the same title exists across multiple years
   */
  async searchMovie(query: string, yearHint?: number | null): Promise<TMDBSearchResult | null> {
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

      // Use yearHint (from batch context) if provided, otherwise use extracted year from query
      const targetYear = yearHint || extractedYear;
      console.log(`[TMDB] Searching for movie: "${titleWithoutYear}"${targetYear ? ` (year: ${targetYear}${yearHint ? ' from batch context' : ''})` : ''}`);

      // Try primary search with year if available
      let result = await this.searchMovieByTitle(titleWithoutYear, targetYear);

      // If no result and the query was transformed, try original title too
      if (!result && titleWithoutYear !== query) {
        const originalTitle = query.replace(/^watch\s+/i, '').replace(/^find\s+and\s+watch\s+/i, '').trim();
        const { title: origWithoutYear, year: origYear } = this.extractYearFromQuery(originalTitle);
        if (origWithoutYear !== titleWithoutYear) {
          console.log(`[TMDB] Trying fallback search with original: "${origWithoutYear}"`);
          result = await this.searchMovieByTitle(origWithoutYear, origYear || targetYear);
        }
      }

      // If still no result WITH year constraint, try without year - but only if yearHint wasn't provided
      // If yearHint was provided (from batch context), we should respect it and not return a random year match
      if (!result && targetYear && !yearHint) {
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

      // ============================================================
      // STRICT TIERED VALIDATION SYSTEM
      // Each tier is a hard gate - candidate must pass ALL tiers
      // ============================================================
      let passedCandidate: TMDBMovie | null = null;
      let passedScore = 0;

      // Extract director/actor from query if provided (e.g., "Inception by Christopher Nolan")
      const { title: titleWithoutCreator, director: queryDirector, actor: queryActor } = this.extractCreatorFromQuery(cleanQuery);
      const effectiveQuery = titleWithoutCreator || cleanQuery;

      console.log(`[TMDB] Starting TIERED validation for "${effectiveQuery}"${targetYear ? ` (year: ${targetYear})` : ''}${queryDirector ? ` (director: ${queryDirector})` : ''}${queryActor ? ` (actor: ${queryActor})` : ''}`);

      for (const movie of data.results.slice(0, 10) as TMDBMovie[]) {
        const movieYear = movie.release_date ? parseInt(movie.release_date.substring(0, 4), 10) : null;
        const tierResults: string[] = [];

        // ========== TIER 1: Title Similarity ≥ 80% ==========
        let titleScore = this.calculateTitleSimilarity(effectiveQuery, movie.title);

        // Also check original_title if different
        if (movie.original_title && movie.original_title !== movie.title) {
          const originalScore = this.calculateTitleSimilarity(effectiveQuery, movie.original_title);
          if (originalScore > titleScore) {
            titleScore = originalScore;
          }
        }

        if (titleScore < 0.80) {
          console.log(`[TMDB] TIER 1 FAIL: "${movie.title}" (${(titleScore * 100).toFixed(0)}% < 80%)`);
          continue; // FAIL - skip to next candidate
        }
        tierResults.push(`T1:${(titleScore * 100).toFixed(0)}%`);

        // ========== TIER 2: Year Match ±1 (if year provided) ==========
        if (targetYear && movieYear) {
          const yearDiff = Math.abs(movieYear - targetYear);
          if (yearDiff > 1) {
            console.log(`[TMDB] TIER 2 FAIL: "${movie.title}" year ${movieYear} vs expected ${targetYear} (diff: ${yearDiff})`);
            continue; // FAIL - skip to next candidate
          }
          tierResults.push(`T2:year=${movieYear}`);
        }

        // Also check batch context year range if no explicit year
        const ctx = this.batchContext;
        if (!targetYear && ctx && ctx.confidence > 0.5 && ctx.inferredYearRange && movieYear) {
          const { min, max } = ctx.inferredYearRange;
          if (movieYear < min - 1 || movieYear > max + 1) {
            console.log(`[TMDB] TIER 2 FAIL: "${movie.title}" year ${movieYear} outside batch range ${min}-${max}`);
            continue; // FAIL - skip to next candidate
          }
          tierResults.push(`T2:batch-year=${movieYear}`);
        }

        // ========== TIER 3: Popularity/Engagement Gate ==========
        // Prevent knockoff/spam movies from being matched
        if (movie.popularity < 5 && movie.vote_count < 50) {
          console.log(`[TMDB] TIER 3 FAIL: "${movie.title}" too obscure (popularity=${movie.popularity}, votes=${movie.vote_count})`);
          continue; // FAIL - skip to next candidate
        }
        tierResults.push(`T3:pop=${movie.popularity.toFixed(0)}`);

        // ========== TIER 4: Director/Cast Match (if provided) ==========
        if (queryDirector || queryActor) {
          const details = await this.getMovieDetails(movie.id);
          const actualDirector = details?.credits?.crew?.find((c: any) => c.job === 'Director')?.name;
          const actualCast = details?.credits?.cast?.slice(0, 10).map((c: any) => c.name) || [];

          if (queryDirector) {
            const directorMatches = actualDirector &&
              actualDirector.toLowerCase().includes(queryDirector.toLowerCase());
            if (!directorMatches) {
              console.log(`[TMDB] TIER 4 FAIL: "${movie.title}" director mismatch - expected "${queryDirector}", got "${actualDirector || 'unknown'}"`);
              continue; // FAIL - skip to next candidate
            }
            tierResults.push(`T4:director=${actualDirector}`);
          }

          if (queryActor) {
            const actorMatches = actualCast.some((name: string) =>
              name.toLowerCase().includes(queryActor.toLowerCase())
            );
            if (!actorMatches) {
              console.log(`[TMDB] TIER 4 FAIL: "${movie.title}" actor "${queryActor}" not in cast: [${actualCast.slice(0, 5).join(', ')}]`);
              continue; // FAIL - skip to next candidate
            }
            tierResults.push(`T4:cast-verified`);
          }
        }

        // ========== ALL TIERS PASSED ==========
        console.log(`[TMDB] ALL TIERS PASSED: "${movie.title}" (${movieYear || '?'}) [${tierResults.join(', ')}]`);
        passedCandidate = movie;
        passedScore = titleScore;
        break; // Take first passing candidate (TMDB returns by relevance)
      }

      // No candidate passed all tiers
      if (!passedCandidate) {
        console.log(`[TMDB] No candidate passed all tiers for "${cleanQuery}"`);
        return null;
      }

      console.log(`[TMDB] VERIFIED match: "${passedCandidate.title}" (${passedCandidate.release_date?.substring(0, 4)}) with ${(passedScore * 100).toFixed(0)}% title similarity`);

      const details = await this.getMovieDetails(passedCandidate.id);

      // PRIORITY: Use BACKDROP (landscape) images for better display on cards
      // Fetch English backdrop from images endpoint for best quality
      let backdropPath = await this.getEnglishBackdrop(passedCandidate.id, 'movie');
      if (!backdropPath) {
        backdropPath = passedCandidate.backdrop_path || details?.backdrop_path || null;
      }

      // Poster as fallback
      let posterPath = passedCandidate.poster_path || details?.poster_path;
      if (!posterPath) {
        posterPath = await this.getMovieImages(passedCandidate.id);
      }

      // Primary image is now BACKDROP (landscape), with poster as fallback
      const backdropUrl = this.getImageUrl(backdropPath, 'w780') || this.getImageUrl(backdropPath, 'original');
      const posterUrl = this.getImageUrl(posterPath, 'w500');

      if (!backdropUrl && !posterUrl) {
        console.log(`[TMDB] WARNING: No backdrop or poster found for "${passedCandidate.title}"`);
      } else {
        console.log(`[TMDB] Got images for "${passedCandidate.title}": backdrop=${backdropUrl ? 'yes' : 'no'}, poster=${posterUrl ? 'yes' : 'no'}`);
      }

      return {
        // Return backdrop as primary for landscape display
        posterUrl: backdropUrl || posterUrl,
        backdropUrl: backdropUrl,
        title: passedCandidate.title,
        overview: passedCandidate.overview,
        releaseYear: passedCandidate.release_date?.substring(0, 4) || '',
        rating: Math.round(passedCandidate.vote_average * 10) / 10,
        ratingCount: passedCandidate.vote_count,
        genres: details?.genres?.map(g => g.name) || [],
        director: details?.credits?.crew?.find((c: any) => c.job === 'Director')?.name,
        cast: details?.credits?.cast?.slice(0, 5).map((c: any) => c.name),
        runtime: details?.runtime ? `${details.runtime} min` : undefined,
        tmdbId: passedCandidate.id,
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

      // ============================================================
      // STRICT TIERED VALIDATION SYSTEM FOR TV
      // Each tier is a hard gate - candidate must pass ALL tiers
      // ============================================================
      let passedCandidate: TMDBTVShow | null = null;
      let passedScore = 0;

      console.log(`[TMDB] Starting TIERED validation for TV "${searchTitle}"${searchYear ? ` (year: ${searchYear})` : ''}`);

      for (const show of data.results.slice(0, 15) as TMDBTVShow[]) {
        const showYear = show.first_air_date ? parseInt(show.first_air_date.substring(0, 4), 10) : null;
        const tierResults: string[] = [];

        // ========== TIER 1: Title Similarity ≥ 80% ==========
        let titleScore = this.calculateTitleSimilarity(searchTitle, show.name);

        // Also check original_name if different
        if (show.original_name && show.original_name !== show.name) {
          const originalScore = this.calculateTitleSimilarity(searchTitle, show.original_name);
          if (originalScore > titleScore) {
            titleScore = originalScore;
          }
        }

        // For short titles (1-2 words), require exact match
        if (isShortTitle) {
          const normalizedSearch = searchTitle.toLowerCase().trim();
          const normalizedShow = show.name.toLowerCase().trim();
          if (normalizedSearch !== normalizedShow && titleScore < 0.95) {
            console.log(`[TMDB] TIER 1 FAIL (short title): "${show.name}" not exact match for "${searchTitle}"`);
            continue; // FAIL - skip to next candidate
          }
        }

        if (titleScore < 0.80) {
          console.log(`[TMDB] TIER 1 FAIL: "${show.name}" (${(titleScore * 100).toFixed(0)}% < 80%)`);
          continue; // FAIL - skip to next candidate
        }
        tierResults.push(`T1:${(titleScore * 100).toFixed(0)}%`);

        // ========== TIER 2: Year Match ±1 (if year provided) ==========
        if (searchYear && showYear) {
          const yearDiff = Math.abs(showYear - searchYear);
          if (yearDiff > 1) {
            console.log(`[TMDB] TIER 2 FAIL: "${show.name}" year ${showYear} vs expected ${searchYear} (diff: ${yearDiff})`);
            continue; // FAIL - skip to next candidate
          }
          tierResults.push(`T2:year=${showYear}`);
        }

        // Also check batch context year range if no explicit year
        const ctx = this.batchContext;
        if (!searchYear && ctx && ctx.confidence > 0.5 && ctx.inferredYearRange && showYear) {
          const { min, max } = ctx.inferredYearRange;
          if (showYear < min - 1 || showYear > max + 1) {
            console.log(`[TMDB] TIER 2 FAIL: "${show.name}" year ${showYear} outside batch range ${min}-${max}`);
            continue; // FAIL - skip to next candidate
          }
          tierResults.push(`T2:batch-year=${showYear}`);
        }

        // ========== TIER 3: Popularity/Engagement Gate ==========
        // Prevent knockoff/spam shows from being matched
        if (show.popularity < 5 && show.vote_count < 50) {
          console.log(`[TMDB] TIER 3 FAIL: "${show.name}" too obscure (popularity=${show.popularity}, votes=${show.vote_count})`);
          continue; // FAIL - skip to next candidate
        }
        tierResults.push(`T3:pop=${show.popularity.toFixed(0)}`);

        // ========== TIER 4: Language/Region Gate (if batch context indicates) ==========
        if (ctx && ctx.confidence > 0.5) {
          // If batch expects English content, reject non-English with low title match
          if (ctx.inferredRegion === 'US' && show.original_language !== 'en' && titleScore < 0.95) {
            console.log(`[TMDB] TIER 4 FAIL: "${show.name}" non-English (${show.original_language}) for US batch`);
            continue; // FAIL - skip to next candidate
          }
          // If batch expects Korean content, reject non-Korean
          if (ctx.inferredRegion === 'Korea' && show.original_language !== 'ko' && titleScore < 0.95) {
            console.log(`[TMDB] TIER 4 FAIL: "${show.name}" non-Korean (${show.original_language}) for Korean batch`);
            continue; // FAIL - skip to next candidate
          }
          tierResults.push(`T4:lang=${show.original_language}`);
        }

        // ========== ALL TIERS PASSED ==========
        console.log(`[TMDB] ALL TIERS PASSED: "${show.name}" (${showYear || '?'}) [${tierResults.join(', ')}]`);
        passedCandidate = show;
        passedScore = titleScore;
        break; // Take first passing candidate (TMDB returns by relevance)
      }

      // No candidate passed all tiers
      if (!passedCandidate) {
        console.log(`[TMDB] No TV candidate passed all tiers for "${searchTitle}"`);
        return null;
      }

      console.log(`[TMDB] VERIFIED TV match: "${passedCandidate.name}" (${passedCandidate.first_air_date?.substring(0, 4)}) with ${(passedScore * 100).toFixed(0)}% title similarity`);

      // PRIORITY: Use BACKDROP (landscape) images for better display on cards
      let backdropPath = await this.getEnglishBackdrop(passedCandidate.id, 'tv');
      if (!backdropPath) {
        backdropPath = passedCandidate.backdrop_path;
      }

      const posterPath = passedCandidate.poster_path;

      // Primary image is now BACKDROP (landscape), with poster as fallback
      const backdropUrl = this.getImageUrl(backdropPath, 'w780');
      const posterUrl = this.getImageUrl(posterPath, 'w500');

      return {
        // Return backdrop as primary for landscape display
        posterUrl: backdropUrl || posterUrl,
        backdropUrl: backdropUrl,
        title: passedCandidate.name,
        overview: passedCandidate.overview,
        releaseYear: passedCandidate.first_air_date?.substring(0, 4) || '',
        rating: Math.round(passedCandidate.vote_average * 10) / 10,
        ratingCount: passedCandidate.vote_count,
        genres: [],
        tmdbId: passedCandidate.id,
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

  /**
   * Extract director or cast member from query string.
   * Patterns: "Inception by Christopher Nolan", "Movie directed by X", "with Leonardo DiCaprio"
   */
  extractCreatorFromQuery(query: string): { title: string; director?: string; actor?: string } {
    let title = query;
    let director: string | undefined;
    let actor: string | undefined;

    // Director patterns
    const directorPatterns = [
      /\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*$/i,           // "by Christopher Nolan"
      /\s+directed\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*$/i, // "directed by Christopher Nolan"
      /\s+-\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+film\s*$/i,      // "- Christopher Nolan film"
    ];

    for (const pattern of directorPatterns) {
      const match = query.match(pattern);
      if (match) {
        director = match[1].trim();
        title = query.replace(pattern, '').trim();
        console.log(`[TMDB] Extracted director "${director}" from query`);
        break;
      }
    }

    // Actor patterns
    const actorPatterns = [
      /\s+with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*$/i,          // "with Leonardo DiCaprio"
      /\s+starring\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*$/i,      // "starring Leonardo DiCaprio"
    ];

    for (const pattern of actorPatterns) {
      const match = title.match(pattern);
      if (match) {
        actor = match[1].trim();
        title = title.replace(pattern, '').trim();
        console.log(`[TMDB] Extracted actor "${actor}" from query`);
        break;
      }
    }

    return { title, director, actor };
  }

  /**
   * Verify if a TMDB result matches the expected director/cast.
   * Returns true if the director or any cast member matches.
   */
  async verifyCreatorMatch(
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    expectedDirector?: string,
    expectedActor?: string
  ): Promise<{ matches: boolean; actualDirector?: string; actualCast?: string[] }> {
    if (!expectedDirector && !expectedActor) {
      return { matches: true }; // Nothing to verify
    }

    try {
      const details = mediaType === 'movie'
        ? await this.getMovieDetails(tmdbId)
        : await this.getTVDetails(tmdbId);

      if (!details) return { matches: true }; // Can't verify, assume match

      const actualDirector = details.credits?.crew?.find((c: any) => c.job === 'Director')?.name;
      const actualCast = details.credits?.cast?.slice(0, 10).map((c: any) => c.name) || [];

      const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');

      let matches = true;

      if (expectedDirector) {
        const directorMatches = actualDirector &&
          normalize(actualDirector).includes(normalize(expectedDirector));
        if (!directorMatches) {
          console.log(`[TMDB] Director mismatch: expected "${expectedDirector}", got "${actualDirector}"`);
          matches = false;
        }
      }

      if (expectedActor) {
        const actorMatches = actualCast.some((name: string) =>
          normalize(name).includes(normalize(expectedActor))
        );
        if (!actorMatches) {
          console.log(`[TMDB] Actor mismatch: expected "${expectedActor}", not found in cast`);
          matches = false;
        }
      }

      return { matches, actualDirector, actualCast };
    } catch (error) {
      console.error('[TMDB] Creator verification error:', error);
      return { matches: true }; // Can't verify, assume match
    }
  }

  /**
   * Search and return multiple candidates with confidence scores.
   * Used when we want to let the user pick from multiple options.
   */
  async searchWithCandidates(
    query: string,
    maxCandidates: number = 5
  ): Promise<{
    bestMatch: TMDBSearchResult | null;
    candidates: Array<{
      result: TMDBSearchResult;
      confidence: number;
      confidenceLevel: 'high' | 'medium' | 'low';
      matchReasons: string[];
    }>;
    needsUserConfirmation: boolean;
  }> {
    if (!this.apiKey) {
      return { bestMatch: null, candidates: [], needsUserConfirmation: false };
    }

    try {
      const { title: cleanTitle, director, actor } = this.extractCreatorFromQuery(query);
      const { title: titleWithoutYear, year: extractedYear } = this.extractYearFromQuery(cleanTitle);
      const searchTitle = titleWithoutYear || cleanTitle;

      console.log(`[TMDB] Searching with candidates: "${searchTitle}"${extractedYear ? ` (${extractedYear})` : ''}${director ? ` by ${director}` : ''}${actor ? ` with ${actor}` : ''}`);

      // Search both movies and TV
      let url = `${TMDB_BASE_URL}/search/multi?api_key=${this.apiKey}&query=${encodeURIComponent(searchTitle)}&include_adult=false&language=en-US`;
      if (extractedYear) {
        url += `&year=${extractedYear}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        return { bestMatch: null, candidates: [], needsUserConfirmation: false };
      }

      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        return { bestMatch: null, candidates: [], needsUserConfirmation: false };
      }

      // Filter to only movies and TV shows
      const mediaResults = data.results.filter((r: any) =>
        r.media_type === 'movie' || r.media_type === 'tv'
      ).slice(0, 10);

      const candidates: Array<{
        result: TMDBSearchResult;
        confidence: number;
        confidenceLevel: 'high' | 'medium' | 'low';
        matchReasons: string[];
      }> = [];

      for (const item of mediaResults) {
        const isMovie = item.media_type === 'movie';
        const title = isMovie ? item.title : item.name;
        const releaseDate = isMovie ? item.release_date : item.first_air_date;
        const releaseYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : null;

        // Calculate confidence score
        let confidence = this.calculateTitleSimilarity(searchTitle, title);
        const matchReasons: string[] = [];

        // Year matching bonus/penalty
        if (extractedYear && releaseYear) {
          if (releaseYear === extractedYear) {
            confidence += 0.2;
            matchReasons.push(`Year matches (${extractedYear})`);
          } else if (Math.abs(releaseYear - extractedYear) === 1) {
            confidence += 0.1;
            matchReasons.push(`Year close (${releaseYear} vs ${extractedYear})`);
          } else {
            confidence -= 0.15;
            matchReasons.push(`Year mismatch (${releaseYear} vs ${extractedYear})`);
          }
        }

        // Popularity bonus
        if (item.popularity > 50) {
          confidence += 0.1;
          matchReasons.push('High popularity');
        } else if (item.popularity < 5) {
          confidence -= 0.1;
          matchReasons.push('Low popularity');
        }

        // Vote count bonus
        if (item.vote_count > 1000) {
          confidence += 0.05;
          matchReasons.push('Many reviews');
        }

        // Director/cast verification (if provided)
        if (director || actor) {
          const verification = await this.verifyCreatorMatch(
            item.id,
            isMovie ? 'movie' : 'tv',
            director,
            actor
          );
          if (verification.matches) {
            confidence += 0.25;
            if (director) matchReasons.push(`Director: ${verification.actualDirector || director}`);
            if (actor) matchReasons.push(`Cast verified`);
          } else {
            confidence -= 0.3;
            matchReasons.push('Creator mismatch');
          }
        }

        // Determine confidence level
        const confidenceLevel: 'high' | 'medium' | 'low' =
          confidence >= 0.85 ? 'high' :
          confidence >= 0.65 ? 'medium' : 'low';

        // Get poster/backdrop
        const backdropUrl = this.getImageUrl(item.backdrop_path, 'w780');
        const posterUrl = this.getImageUrl(item.poster_path, 'w500');

        candidates.push({
          result: {
            posterUrl: backdropUrl || posterUrl,
            backdropUrl,
            title,
            overview: item.overview,
            releaseYear: releaseYear?.toString() || '',
            rating: Math.round(item.vote_average * 10) / 10,
            ratingCount: item.vote_count,
            genres: [],
            tmdbId: item.id,
            mediaType: isMovie ? 'movie' : 'tv'
          },
          confidence,
          confidenceLevel,
          matchReasons
        });
      }

      // Sort by confidence
      candidates.sort((a, b) => b.confidence - a.confidence);

      // Take top N candidates
      const topCandidates = candidates.slice(0, maxCandidates);

      // Determine if we need user confirmation
      const bestCandidate = topCandidates[0];
      const needsUserConfirmation =
        !bestCandidate ||
        bestCandidate.confidenceLevel !== 'high' ||
        (topCandidates.length > 1 &&
          topCandidates[1].confidence > bestCandidate.confidence - 0.15);

      console.log(`[TMDB] Found ${topCandidates.length} candidates, best: "${bestCandidate?.result.title}" (${(bestCandidate?.confidence * 100).toFixed(0)}%), needs confirmation: ${needsUserConfirmation}`);

      return {
        bestMatch: bestCandidate?.confidenceLevel === 'high' ? bestCandidate.result : null,
        candidates: topCandidates,
        needsUserConfirmation
      };
    } catch (error) {
      console.error('[TMDB] Search with candidates error:', error);
      return { bestMatch: null, candidates: [], needsUserConfirmation: false };
    }
  }

  /**
   * Get TV show details including credits
   */
  private async getTVDetails(tvId: number): Promise<any> {
    if (!this.apiKey) return null;

    try {
      const url = `${TMDB_BASE_URL}/tv/${tvId}?api_key=${this.apiKey}&append_to_response=credits`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error('[TMDB] TV details error:', error);
      return null;
    }
  }
}

export const tmdbService = new TMDBService();
