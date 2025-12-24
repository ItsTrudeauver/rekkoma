// src/services/miner.js
import { fetchFromSpotify, fetchArtistGenres } from './spotify';
import { fetchTrackTags } from './lastfm'; // Make sure you created this service!
import { getDecade, cleanGenre } from '../utils/cleaning';

const INITIAL_LIMIT = 50; 
const EXPANSION_LIMIT = 50; 

/**
 * 1. MINE TRACKS (Entry Point)
 * Fetches initial pool based on user seed.
 */
export async function mineTracks(seedQuery) {
  console.log(`🌱 SEED MINING: ${seedQuery}`);
  const res = await fetchFromSpotify('search', { q: seedQuery, type: 'track', limit: INITIAL_LIMIT });
  if (!res?.tracks?.items?.length) throw new Error("No tracks found.");
  return await hydrateTracks(res.tracks.items);
}

/**
 * 2. EXPAND POOL (For "More like this")
 * Finds new tracks that match a specific genre + original seed.
 */
export async function expandPool(currentPool, genre, seedQuery) {
  console.log(`⚓ ANCHORED EXPANSION: "${seedQuery}" + Genre: "${genre}"`);
  // Refined query to ensure relevance
  const query = `${seedQuery} genre:"${genre}"`;
  
  const res = await fetchFromSpotify('search', { q: query, type: 'track', limit: EXPANSION_LIMIT });
  
  if (!res?.tracks?.items) {
    console.warn("Expansion found nothing.");
    return currentPool;
  }
  
  const newTracks = await hydrateTracks(res.tracks.items);
  
  // Deduplicate: Don't add tracks we already have
  const existingIds = new Set(currentPool.map(t => t.id));
  const uniqueNewTracks = newTracks.filter(t => !existingIds.has(t.id));
  
  // Add new tracks to the list (they will be sorted by score later in the hook)
  return [...currentPool, ...uniqueNewTracks];
}

/**
 * 3. THE "VIBE GUESSER" ENGINE
 * Simulates Spotify's banned Audio Features by analyzing text data.
 * Combines Spotify's "Artist Genres" + Last.fm's "Track Tags".
 */
function inferVibes(genres = [], tags = []) {
  // We double the weight of Last.fm tags because they are track-specific (more accurate)
  const combined = [...genres, ...tags, ...tags].join(' ').toLowerCase();

  // Default Stats: Mid-tempo, neutral mood
  let stats = {
    energy: 0.5,
    valence: 0.5,
    danceability: 0.5,
    acousticness: 0.1,
    instrumentalness: 0.1
  };

  // --- A. ENERGY / DANCEABILITY ---
  if (combined.match(/metal|punk|rock|hyper|club|dance|edm|house|techno|upbeat|party|gym|workout|running|banger/)) {
    stats.energy += 0.35;
    stats.danceability += 0.25;
  }
  if (combined.match(/chill|relax|sleep|ambient|lo-fi|slow|ballad|acoustic|soft|downtempo|jazz/)) {
    stats.energy -= 0.3;
    stats.danceability -= 0.2;
  }

  // --- B. VALENCE (Mood) ---
  // Last.fm tags like "tearjerker" or "cry" are powerful signals here
  if (combined.match(/sad|melancholy|dark|depressing|gloom|cry|tearjerker|heartbreak|longing|suicidal|goth|emo|doom/)) {
    stats.valence -= 0.45; 
  }
  if (combined.match(/happy|joy|fun|summer|good vibes|feel good|cheer|sunny|upbeat|pop|disco|funk/)) {
    stats.valence += 0.4;
  }

  // --- C. TEXTURE (Acoustic vs. Electronic) ---
  if (combined.match(/acoustic|unplugged|folk|piano|guitar|stripped|country|bluegrass|classical/)) {
    stats.acousticness = 0.85;
  }
  if (combined.match(/electronic|synth|techno|house|dubstep|hyper|industrial|glitch/)) {
    stats.acousticness = 0.05;
  }
  if (combined.match(/instrumental|score|soundtrack|no vocals|post-rock|ambient/)) {
    stats.instrumentalness = 0.9;
  }

  // --- D. NOISE / FUZZ ---
  // Add random variance so 50 "Pop" songs don't have identical stats.
  // This helps the game filter them gradually.
  const noise = () => (Math.random() * 0.2) - 0.1;
  
  Object.keys(stats).forEach(k => {
    stats[k] = Math.max(0, Math.min(1, stats[k] + noise()));
  });

  return stats;
}

/**
 * 4. HYDRATION (Data Merging)
 * Takes raw Spotify tracks and enriches them with:
 * - Spotify Artist Genres
 * - Last.fm Track Tags
 * - Simulated Vibe Scores
 */
async function hydrateTracks(rawTracks) {
  const cleanRaw = rawTracks.filter(t => t && t.id);
  
  // A. Fetch Spotify Artist Genres (Batch Request)
  let artistMap = {};
  try {
    const artistIds = [...new Set(cleanRaw.map(t => t.artists[0]?.id).filter(Boolean))];
    if (artistIds.length > 0) {
      // Split into chunks of 50 (Spotify API Limit)
      const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
      const batches = chunk(artistIds, 50);
      
      for (const batch of batches) {
        const batchMap = await fetchArtistGenres(batch);
        artistMap = { ...artistMap, ...batchMap };
      }
    }
  } catch (e) { console.warn("Genre fetch failed", e); }

  // B. Process Tracks in Parallel (Fetch Last.fm Tags + Infer Vibes)
  const detailedTracks = await Promise.all(cleanRaw.map(async (track) => {
    const artistName = track.artists?.[0]?.name || "Unknown";
    const trackName = track.name || "Unknown";
    const primaryArtistId = track.artists?.[0]?.id;

    // 1. Get Spotify Genres
    const rawGenres = artistMap[primaryArtistId] || [];
    const genres = rawGenres.map(g => cleanGenre(g)).filter(Boolean);

    // 2. Get Last.fm Tags (The "Smart" Layer)
    let tags = [];
    try {
      // This is the external call to Last.fm
      tags = await fetchTrackTags(artistName, trackName);
    } catch (e) {
      // Fail silently; we fallback to genres
      console.log(`No tags found for ${trackName}`);
    }

    // 3. Infer Vibes using EVERYTHING we know
    const vibes = inferVibes(genres, tags);
    
    return {
      id: track.id,
      name: trackName,
      artist: artistName,
      image: track.album?.images?.[0]?.url || null,
      release_date: track.album?.release_date || '2000',
      decade: getDecade(track.album?.release_date),
      
      // Store both for debugging/display
      genres: [...genres, ...tags], 
      
      popularity: track.popularity || 0,
      
      // Inferred Vibe Stats
      energy: vibes.energy,
      valence: vibes.valence,
      danceability: vibes.danceability,
      acousticness: vibes.acousticness,
      instrumentalness: vibes.instrumentalness,
      duration_ms: track.duration_ms || 0,
      
      // Game State
      score: 0 
    };
  }));

  return detailedTracks;
}