import { SpotifyApi, AccessToken } from "@spotify/web-api-ts-sdk";

let connectionSettings: any;
let cachedTokens: { access_token: string; expires_at: number } | null = null;

async function refreshSpotifyToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  try {
    // Refresh connection settings from Replit connectors
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => {
      if (!res.ok) {
        throw new Error(`Failed to fetch connection: ${res.status}`);
      }
      return res.json();
    }).then(data => data.items?.[0]);

    if (!connectionSettings) {
      throw new Error('Spotify connection not found');
    }

    const refreshToken = connectionSettings?.settings?.oauth?.credentials?.refresh_token;
    const accessToken = connectionSettings?.settings?.access_token || 
                       connectionSettings.settings?.oauth?.credentials?.access_token;
    const clientId = connectionSettings?.settings?.oauth?.credentials?.client_id;
    const clientSecret = connectionSettings?.settings?.oauth?.credentials?.client_secret;
    const expiresIn = connectionSettings.settings?.oauth?.credentials?.expires_in || 3600;

    if (!accessToken || !clientId || !refreshToken) {
      throw new Error('Spotify not properly connected - missing credentials');
    }

    // Check if we need to refresh the token
    const expiresAt = connectionSettings.settings?.expires_at 
      ? new Date(connectionSettings.settings.expires_at).getTime()
      : Date.now() + (expiresIn * 1000);

    if (expiresAt <= Date.now() + 60000) { // Refresh if expires within 1 minute
      console.log('Refreshing Spotify access token...');
      
      // Use Spotify's token refresh endpoint
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token refresh failed: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Update cached tokens
      cachedTokens = {
        access_token: tokenData.access_token,
        expires_at: Date.now() + (tokenData.expires_in * 1000)
      };

      return {
        accessToken: tokenData.access_token,
        clientId,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresIn: tokenData.expires_in
      };
    }

    return { accessToken, clientId, refreshToken, expiresIn };

  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    throw new Error('Failed to refresh Spotify connection');
  }
}

async function getAccessToken() {
  // Check cached tokens first
  if (cachedTokens && cachedTokens.expires_at > Date.now() + 60000) {
    return {
      accessToken: cachedTokens.access_token,
      clientId: connectionSettings?.settings?.oauth?.credentials?.client_id,
      refreshToken: connectionSettings?.settings?.oauth?.credentials?.refresh_token,
      expiresIn: Math.floor((cachedTokens.expires_at - Date.now()) / 1000)
    };
  }

  return await refreshSpotifyToken();
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableSpotifyClient() {
  const { accessToken, clientId, refreshToken, expiresIn } = await getAccessToken();

  const tokenInfo: AccessToken = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn || 3600,
    refresh_token: refreshToken,
  };

  const spotify = SpotifyApi.withAccessToken(clientId, tokenInfo);

  return spotify;
}

// Helper function to get audio features for tracks
export async function getAudioFeatures(trackIds: string[]) {
  try {
    const spotify = await getUncachableSpotifyClient();
    const features = await spotify.tracks.audioFeatures(trackIds);
    return features;
  } catch (error) {
    console.error('Error fetching audio features:', error);
    return null;
  }
}