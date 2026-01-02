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
  // 0.5 = at least 50% of query words must match the result title
  private readonly SIMILARITY_THRESHOLD = 0.4;

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

  async searchMovie(query: string): Promise<TMDBSearchResult | null> {
    if (!this.apiKey) {
      console.warn('[TMDB] Cannot search - no API key configured');
      return null;
    }

    try {
      const cleanQuery = this.extractMovieTitle(query);
      console.log(`[TMDB] Searching for movie: "${cleanQuery}"`);

      const url = `${TMDB_BASE_URL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(cleanQuery)}&include_adult=false`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[TMDB] Search failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        console.log(`[TMDB] No movies found for: "${cleanQuery}"`);
        return await this.searchTV(cleanQuery);
      }

      // CRITICAL FIX: Find the best matching result instead of blindly taking first
      // This prevents "Wicked for Good" from returning "Puppy Love" poster
      let bestMatch: TMDBMovie | null = null;
      let bestScore = 0;

      // Check top 5 results for best title match
      for (const movie of data.results.slice(0, 5) as TMDBMovie[]) {
        const score = this.calculateTitleSimilarity(cleanQuery, movie.title);
        console.log(`[TMDB] Title match: "${movie.title}" = ${(score * 100).toFixed(0)}%`);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = movie;
        }

        // Perfect or near-perfect match - stop searching
        if (score >= 0.9) break;
      }

      // Reject if no result meets the similarity threshold
      if (!bestMatch || bestScore < this.SIMILARITY_THRESHOLD) {
        console.log(`[TMDB] No good movie match for "${cleanQuery}" (best score: ${(bestScore * 100).toFixed(0)}%, threshold: ${this.SIMILARITY_THRESHOLD * 100}%)`);
        // Try TV as fallback
        return await this.searchTV(cleanQuery);
      }

      console.log(`[TMDB] Best match: "${bestMatch.title}" (${bestMatch.release_date?.substring(0, 4)}) with ${(bestScore * 100).toFixed(0)}% similarity`);

      const details = await this.getMovieDetails(bestMatch.id);

      return {
        posterUrl: this.getImageUrl(bestMatch.poster_path, 'w500'),
        backdropUrl: this.getImageUrl(bestMatch.backdrop_path, 'w780'),
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

  async searchTV(query: string): Promise<TMDBSearchResult | null> {
    if (!this.apiKey) return null;

    try {
      const cleanQuery = this.extractMovieTitle(query);
      console.log(`[TMDB] Searching for TV show: "${cleanQuery}"`);

      const url = `${TMDB_BASE_URL}/search/tv?api_key=${this.apiKey}&query=${encodeURIComponent(cleanQuery)}&include_adult=false`;
      const response = await fetch(url);

      if (!response.ok) return null;

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        console.log(`[TMDB] No TV shows found for: "${cleanQuery}"`);
        return null;
      }

      // CRITICAL FIX: Find the best matching TV show instead of blindly taking first
      let bestMatch: TMDBTVShow | null = null;
      let bestScore = 0;

      for (const show of data.results.slice(0, 5) as TMDBTVShow[]) {
        const score = this.calculateTitleSimilarity(cleanQuery, show.name);
        console.log(`[TMDB] TV match: "${show.name}" = ${(score * 100).toFixed(0)}%`);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = show;
        }

        if (score >= 0.9) break;
      }

      // Reject if no result meets threshold
      if (!bestMatch || bestScore < this.SIMILARITY_THRESHOLD) {
        console.log(`[TMDB] No good TV match for "${cleanQuery}" (best score: ${(bestScore * 100).toFixed(0)}%)`);
        return null;
      }

      console.log(`[TMDB] Best TV match: "${bestMatch.name}" (${bestMatch.first_air_date?.substring(0, 4)}) with ${(bestScore * 100).toFixed(0)}% similarity`);

      return {
        posterUrl: this.getImageUrl(bestMatch.poster_path, 'w500'),
        backdropUrl: this.getImageUrl(bestMatch.backdrop_path, 'w780'),
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
      const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${this.apiKey}&append_to_response=credits`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      
      return await response.json();
    } catch (error) {
      console.error('[TMDB] Get details error:', error);
      return null;
    }
  }

  private extractMovieTitle(text: string): string {
    let title = text;

    const watchPatterns = [
      /^watch\s+["']?(.+?)["']?\s*$/i,
      /^["'](.+?)["']\s*(?:movie|film)?$/i,
      /^(.+?)\s+(?:movie|film)\s*$/i,
      /^see\s+["']?(.+?)["']?\s*$/i,
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
      .trim();

    return title || text;
  }
}

export const tmdbService = new TMDBService();
