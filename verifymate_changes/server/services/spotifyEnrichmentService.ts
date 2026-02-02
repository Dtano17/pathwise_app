/**
 * Spotify Enrichment Service
 * 
 * Uses the Replit Spotify integration to get accurate artist/track/album images.
 * Requires Spotify connection via Replit integrations.
 */

import { SpotifyApi } from "@spotify/web-api-ts-sdk";

// WARNING: Never cache the client - access tokens expire
// Always fetch fresh credentials from Replit connector API
async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Spotify integration not configured - missing Replit tokens');
  }

  console.log('[SPOTIFY] Fetching fresh credentials from Replit connector...');
  
  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];
  
  if (!connectionSettings) {
    console.warn('[SPOTIFY] No connection found in response:', JSON.stringify(data).substring(0, 200));
    throw new Error('Spotify not connected - no connection settings found');
  }
  
  const refreshToken = connectionSettings?.settings?.oauth?.credentials?.refresh_token;
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
  const clientId = connectionSettings?.settings?.oauth?.credentials?.client_id;
  const expiresIn = connectionSettings?.settings?.oauth?.credentials?.expires_in;
  
  console.log('[SPOTIFY] Credentials retrieved:', { 
    hasAccessToken: !!accessToken, 
    hasClientId: !!clientId, 
    hasRefreshToken: !!refreshToken,
    expiresIn 
  });
  
  if (!accessToken || !clientId || !refreshToken) {
    throw new Error('Spotify not connected - missing credentials');
  }
  
  return { accessToken, clientId, refreshToken, expiresIn };
}

// WARNING: Never cache this client - always get a fresh one
async function getSpotifyClient(): Promise<SpotifyApi | null> {
  try {
    const { accessToken, clientId, refreshToken, expiresIn } = await getAccessToken();

    const spotify = SpotifyApi.withAccessToken(clientId, {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn || 3600,
      refresh_token: refreshToken,
    });

    return spotify;
  } catch (error) {
    console.warn('[SPOTIFY] Failed to get client:', error);
    return null;
  }
}

export interface SpotifySearchResult {
  imageUrl: string | null;
  name: string;
  artistName?: string;
  albumName?: string;
  releaseYear?: string;
  spotifyUrl: string;
  previewUrl?: string;
  type: 'artist' | 'track' | 'album';
  popularity?: number;
}

class SpotifyEnrichmentService {
  async isAvailable(): Promise<boolean> {
    try {
      const client = await getSpotifyClient();
      return client !== null;
    } catch {
      return false;
    }
  }

  async searchMusic(query: string): Promise<SpotifySearchResult | null> {
    try {
      const client = await getSpotifyClient();
      if (!client) {
        console.warn('[SPOTIFY] Client not available');
        return null;
      }

      const cleanQuery = this.extractMusicQuery(query);
      console.log(`[SPOTIFY] Searching for: "${cleanQuery}"`);

      const results = await client.search(cleanQuery, ['track', 'artist', 'album'], 'US', 5);

      if (results.tracks?.items?.length) {
        const track = results.tracks.items[0];
        const albumImage = track.album?.images?.[0]?.url;
        
        console.log(`[SPOTIFY] Found track: "${track.name}" by ${track.artists?.[0]?.name}`);
        
        return {
          imageUrl: albumImage || null,
          name: track.name,
          artistName: track.artists?.[0]?.name,
          albumName: track.album?.name,
          releaseYear: track.album?.release_date?.substring(0, 4),
          spotifyUrl: track.external_urls?.spotify || '',
          previewUrl: track.preview_url || undefined,
          type: 'track',
          popularity: track.popularity
        };
      }

      if (results.artists?.items?.length) {
        const artist = results.artists.items[0];
        const artistImage = artist.images?.[0]?.url;
        
        console.log(`[SPOTIFY] Found artist: "${artist.name}"`);
        
        return {
          imageUrl: artistImage || null,
          name: artist.name,
          spotifyUrl: artist.external_urls?.spotify || '',
          type: 'artist',
          popularity: artist.popularity
        };
      }

      if (results.albums?.items?.length) {
        const album = results.albums.items[0];
        const albumImage = album.images?.[0]?.url;
        
        console.log(`[SPOTIFY] Found album: "${album.name}" by ${album.artists?.[0]?.name}`);
        
        return {
          imageUrl: albumImage || null,
          name: album.name,
          artistName: album.artists?.[0]?.name,
          releaseYear: album.release_date?.substring(0, 4),
          spotifyUrl: album.external_urls?.spotify || '',
          type: 'album'
        };
      }

      console.log(`[SPOTIFY] No results found for: "${cleanQuery}"`);
      return null;
    } catch (error) {
      console.error('[SPOTIFY] Search error:', error);
      return null;
    }
  }

  async searchArtist(artistName: string): Promise<SpotifySearchResult | null> {
    try {
      const client = await getSpotifyClient();
      if (!client) return null;

      console.log(`[SPOTIFY] Searching for artist: "${artistName}"`);

      const results = await client.search(artistName, ['artist'], 'US', 5);

      if (results.artists?.items?.length) {
        const artist = results.artists.items[0];
        const artistImage = artist.images?.[0]?.url;
        
        console.log(`[SPOTIFY] Found artist: "${artist.name}" with ${artist.followers?.total} followers`);
        
        return {
          imageUrl: artistImage || null,
          name: artist.name,
          spotifyUrl: artist.external_urls?.spotify || '',
          type: 'artist',
          popularity: artist.popularity
        };
      }

      return null;
    } catch (error) {
      console.error('[SPOTIFY] Artist search error:', error);
      return null;
    }
  }

  private extractMusicQuery(text: string): string {
    let query = text;

    const patterns = [
      /^listen\s+to\s+["']?(.+?)["']?\s*$/i,
      /^play\s+["']?(.+?)["']?\s*$/i,
      /^["'](.+?)["']\s+(?:by|from)\s+(.+)$/i,
      /^(.+?)\s+(?:song|track|album|music)\s*$/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        query = match[1].trim();
        if (match[2]) query += ' ' + match[2].trim();
        break;
      }
    }

    query = query
      .replace(/\s*[-–—]\s*notes?\s*$/i, '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();

    return query || text;
  }
}

export const spotifyEnrichmentService = new SpotifyEnrichmentService();
