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

      const movie = data.results[0] as TMDBMovie;
      console.log(`[TMDB] Found movie: "${movie.title}" (${movie.release_date?.substring(0, 4)})`);

      const details = await this.getMovieDetails(movie.id);

      return {
        posterUrl: this.getImageUrl(movie.poster_path, 'w500'),
        backdropUrl: this.getImageUrl(movie.backdrop_path, 'w780'),
        title: movie.title,
        overview: movie.overview,
        releaseYear: movie.release_date?.substring(0, 4) || '',
        rating: Math.round(movie.vote_average * 10) / 10,
        ratingCount: movie.vote_count,
        genres: details?.genres?.map(g => g.name) || [],
        director: details?.credits?.crew?.find(c => c.job === 'Director')?.name,
        cast: details?.credits?.cast?.slice(0, 5).map(c => c.name),
        runtime: details?.runtime ? `${details.runtime} min` : undefined,
        tmdbId: movie.id,
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

      const show = data.results[0] as TMDBTVShow;
      console.log(`[TMDB] Found TV show: "${show.name}" (${show.first_air_date?.substring(0, 4)})`);

      return {
        posterUrl: this.getImageUrl(show.poster_path, 'w500'),
        backdropUrl: this.getImageUrl(show.backdrop_path, 'w780'),
        title: show.name,
        overview: show.overview,
        releaseYear: show.first_air_date?.substring(0, 4) || '',
        rating: Math.round(show.vote_average * 10) / 10,
        ratingCount: show.vote_count,
        genres: [],
        tmdbId: show.id,
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
