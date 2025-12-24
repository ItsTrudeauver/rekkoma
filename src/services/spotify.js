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

  const authString = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
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
    throw new Error("Failed to authenticate with Spotify.");
  }
}

// --- EXPORTED FUNCTIONS ---

/**
 * Generic Fetcher
 */
export async function fetchFromSpotify(endpoint, params = {}) {
  const token = await getAccessToken();
  
  // Use the correct API base URL
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `https://api.spotify.com/v1/${endpoint}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: params
    });
    return response.data;
  } catch (error) {
    // Log but don't crash
    console.warn(`API Error [${endpoint}]:`, error.response?.status);
    return null; 
  }
}

/**
 * Batch fetches artist details to get Genres.
 */
export async function fetchArtistGenres(artistIds) {
  const chunks = [];
  const chunkSize = 50;

  // Split into chunks of 50 (Spotify limit)
  for (let i = 0; i < artistIds.length; i += chunkSize) {
    chunks.push(artistIds.slice(i, i + chunkSize));
  }

  const artistMap = {};

  // Fetch all chunks in parallel
  const promises = chunks.map(chunk => 
    fetchFromSpotify('artists', { ids: chunk.join(',') })
  );

  const results = await Promise.all(promises);

  // Process results
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