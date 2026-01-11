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
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
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
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
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

class TMDBService {
  private apiKey: string | null = null;

  // Minimum similarity threshold for accepting a TMDB result
  // 0.6 = at least 60% of query words must match the result title
  // Increased from 0.4 to prevent "The Pitt" matching "Pittsburgh Steelers"
  private readonly SIMILARITY_THRESHOLD = 0.6;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || null;
    if (this.apiKey) {
      console.log('[TMDB] Service initialized with API key');
    } else {
      console.warn('[TMDB] No API key configured - movie enrichment will fall back to Tavily');
    }
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
   * Calculate word-based similarity between query and result title.
   * Returns a score 0-1 where 1 = perfect match.
   *
   * CRITICAL: This prevents "Wicked for Good" returning "Puppy Love" poster.
   */
  private calculateTitleSimilarity(query: string, resultTitle: string): number {
    // Normalize both strings: lowercase, remove punctuation, collapse whitespace
    const normalize = (s: string) => s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const normalizedQuery = normalize(query);
    const normalizedResult = normalize(resultTitle);

    // Exact match check first
    if (normalizedQuery === normalizedResult) {
      return 1.0;
    }

    // Check if one contains the other (partial match)
    if (normalizedResult.includes(normalizedQuery) || normalizedQuery.includes(normalizedResult)) {
      return 0.9;
    }

    // Word-based matching
    const queryWordsArray = normalizedQuery.split(' ').filter(w => w.length > 1);
    const resultWordsSet = new Set(normalizedResult.split(' ').filter(w => w.length > 1));

    if (queryWordsArray.length === 0) return 0;

    let matches = 0;
    for (let i = 0; i < queryWordsArray.length; i++) {
      if (resultWordsSet.has(queryWordsArray[i])) {
        matches++;
      }
    }

    return matches / queryWordsArray.length;
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
        return await this.searchTV(cleanQuery, targetYear);
      }

      // CRITICAL FIX: Find the best matching result with title AND year matching
      let bestMatch: TMDBMovie | null = null;
      let bestScore = 0;

      // Check top 10 results for best title+year match
      for (const movie of data.results.slice(0, 10) as TMDBMovie[]) {
        let score = this.calculateTitleSimilarity(cleanQuery, movie.title);
        const movieYear = movie.release_date ? parseInt(movie.release_date.substring(0, 4), 10) : null;

        // Boost score if year matches (or penalize if it doesn't match when we have a target year)
        if (targetYear && movieYear) {
          if (movieYear === targetYear) {
            score += 0.2; // Boost for exact year match
            console.log(`[TMDB] Title match: "${movie.title}" (${movieYear}) = ${(score * 100).toFixed(0)}% (year match bonus)`);
          } else if (Math.abs(movieYear - targetYear) <= 1) {
            score += 0.1; // Small boost for off-by-one year
            console.log(`[TMDB] Title match: "${movie.title}" (${movieYear}) = ${(score * 100).toFixed(0)}% (year close)`);
          } else {
            score -= 0.15; // Penalize wrong year
            console.log(`[TMDB] Title match: "${movie.title}" (${movieYear}) = ${(score * 100).toFixed(0)}% (year mismatch: wanted ${targetYear})`);
          }
        } else {
          console.log(`[TMDB] Title match: "${movie.title}" (${movieYear || 'unknown'}) = ${(score * 100).toFixed(0)}%`);
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = movie;
        }

        // Perfect or near-perfect match - stop searching
        if (score >= 1.0) break;
      }

      // Reject if no result meets the similarity threshold
      if (!bestMatch || bestScore < this.SIMILARITY_THRESHOLD) {
        console.log(`[TMDB] No good movie match for "${cleanQuery}" (best score: ${(bestScore * 100).toFixed(0)}%, threshold: ${this.SIMILARITY_THRESHOLD * 100}%)`);
        // Try TV as fallback
        return await this.searchTV(cleanQuery, targetYear);
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

      // CRITICAL FIX: Find the best matching TV show with stricter criteria
      let bestMatch: TMDBTVShow | null = null;
      let bestScore = 0;

      // Current year for recency calculations
      const currentYear = new Date().getFullYear();

      for (const show of data.results.slice(0, 15) as TMDBTVShow[]) {
        let score = this.calculateTitleSimilarity(searchTitle, show.name);
        const showYear = show.first_air_date ? parseInt(show.first_air_date.substring(0, 4), 10) : null;

        // For short titles (1-2 words like "Industry", "Euphoria"), require MUCH stricter matching
        if (isShortTitle) {
          // Must be exact title match (not just contains)
          const normalizedSearch = searchTitle.toLowerCase().trim();
          const normalizedShow = show.name.toLowerCase().trim();
          if (normalizedSearch !== normalizedShow) {
            // Penalize partial matches heavily for short titles
            score -= 0.3;
            console.log(`[TMDB] TV match: "${show.name}" (${showYear || '?'}) = ${(score * 100).toFixed(0)}% (short title - not exact match)`);
            if (score < 0.5) continue; // Skip if too low after penalty
          }
        }

        // Year-based scoring
        if (searchYear && showYear) {
          if (showYear === searchYear) {
            score += 0.25; // Strong boost for exact year match
            console.log(`[TMDB] TV match: "${show.name}" (${showYear}) = ${(score * 100).toFixed(0)}% (year match bonus)`);
          } else if (Math.abs(showYear - searchYear) <= 1) {
            score += 0.1;
            console.log(`[TMDB] TV match: "${show.name}" (${showYear}) = ${(score * 100).toFixed(0)}% (year close)`);
          } else {
            score -= 0.2; // Stronger penalty for wrong year
            console.log(`[TMDB] TV match: "${show.name}" (${showYear}) = ${(score * 100).toFixed(0)}% (year mismatch: wanted ${searchYear})`);
          }
        } else if (showYear) {
          // No target year specified - prefer recent shows (2015+)
          if (showYear >= 2015) {
            score += 0.15; // Boost recent content
            console.log(`[TMDB] TV match: "${show.name}" (${showYear}) = ${(score * 100).toFixed(0)}% (recent content bonus)`);
          } else if (showYear < 2000) {
            score -= 0.25; // Heavily penalize old content when searching for modern TV
            console.log(`[TMDB] TV match: "${show.name}" (${showYear}) = ${(score * 100).toFixed(0)}% (old content penalty)`);
          } else {
            console.log(`[TMDB] TV match: "${show.name}" (${showYear}) = ${(score * 100).toFixed(0)}%`);
          }
        } else {
          console.log(`[TMDB] TV match: "${show.name}" (unknown year) = ${(score * 100).toFixed(0)}%`);
        }

        // Popularity bonus - prefer well-known shows
        if (show.vote_count > 500) {
          score += 0.1;
        } else if (show.vote_count > 100) {
          score += 0.05;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = show;
        }

        // Perfect match with right year - stop searching
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
   * Known movie title mappings for common variations/alternate names.
   * Maps user-friendly titles to TMDB-searchable titles.
   */
  private readonly TITLE_ALIASES: Record<string, string> = {
    'wicked for good': 'Wicked Part Two',
    'wicked part 2': 'Wicked Part Two',
    'wicked 2': 'Wicked Part Two',
    'rental family': 'Rent-a-Family',
    'rentafamily': 'Rent-a-Family',
  };

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

    // Check for known title aliases
    const normalizedTitle = title.toLowerCase().trim();
    if (this.TITLE_ALIASES[normalizedTitle]) {
      console.log(`[TMDB] Using alias: "${title}" -> "${this.TITLE_ALIASES[normalizedTitle]}"`);
      return this.TITLE_ALIASES[normalizedTitle];
    }

    return title || text;
  }
}

export const tmdbService = new TMDBService();
