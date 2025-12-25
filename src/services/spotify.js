import axios from 'axios';

// --- CONFIGURATION ---
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = null;

// --- AUTHENTICATION ---
async function getAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // REAL SPOTIFY AUTH URL
  const authUrl = 'https://accounts.spotify.com/api/token';
  const authString = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  
  try {
    const response = await axios.post(authUrl, 
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    return accessToken;
  } catch (error) {
    console.error("Spotify Auth Error:", error);
    throw new Error("Failed to authenticate with Spotify. Check your VITE_SPOTIFY_CLIENT_ID and SECRET.");
  }
}

// --- EXPORTED FUNCTIONS ---

/**
 * Generic Fetcher
 */
export async function fetchFromSpotify(endpoint, params = {}) {
  const token = await getAccessToken();
  
  // REAL SPOTIFY API BASE URL (V1)
  const baseURL = 'https://api.spotify.com/v1';
  
  // Ensure endpoint format (handle leading slashes)
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${cleanEndpoint}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: params
    });
    return response.data;
  } catch (error) {
    // Log helpful details for debugging
    console.warn(`API Error [${endpoint}]:`, error.response?.status, error.response?.data?.error?.message);
    return null; 
  }
}

/**
 * Batch fetches artist details to get Genres.
 */
export async function fetchArtistGenres(artistIds) {
  const chunks = [];
  const chunkSize = 50;

  for (let i = 0; i < artistIds.length; i += chunkSize) {
    chunks.push(artistIds.slice(i, i + chunkSize));
  }

  const artistMap = {};

  const promises = chunks.map(chunk => 
    fetchFromSpotify('artists', { ids: chunk.join(',') })
  );

  const results = await Promise.all(promises);

  results.forEach(data => {
    if (data && data.artists) {
      data.artists.forEach(artist => {
        if (artist) {
          artistMap[artist.id] = artist.genres || [];
        }
      });
    }
  });

  return artistMap;
}