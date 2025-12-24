// src/services/miner.js
import { fetchFromSpotify, fetchArtistGenres } from './spotify';
import { fetchTrackTags } from './lastfm'; 
import { getDecade, cleanGenre } from '../utils/cleaning';

const INITIAL_LIMIT = 50; 

// --- CONFIGURATION: VIBE WEIGHTS ---
const BLACKLIST = ['seen live', 'favorites', 'owned', 'my library', 'spotify', 'all', 'favorite'];

const KEYWORD_WEIGHTS = {
  // HIGH ENERGY / INTENSITY
  'death metal': { energy: 0.9, valence: 0.2 },
  'metalcore':   { energy: 0.9, valence: 0.3 },
  'hyperpop':    { energy: 0.9, danceability: 0.8 },
  'techno':      { energy: 0.8, instrumentalness: 0.7 },
  'drum and bass': { energy: 0.9, danceability: 0.7 },
  'rock':        { energy: 0.6 },
  'gym':         { energy: 0.8, valence: 0.6 },
  'running':     { energy: 0.8 },
  
  // LOW ENERGY / CHILL
  'ambient':     { energy: 0.1, instrumentalness: 0.9, acousticness: 0.4 },
  'ballad':      { energy: 0.3, danceability: 0.2, valence: 0.3 },
  'lo-fi':       { energy: 0.2, acousticness: 0.6, valence: 0.5 },
  'acoustic':    { energy: 0.3, acousticness: 0.9 },
  'sleep':       { energy: 0.1, valence: 0.5 },
  
  // MOOD SPECIFIC
  'sad':         { valence: 0.1 },
  'depressing':  { valence: 0.1 },
  'heartbreak':  { valence: 0.2 },
  'cry':         { valence: 0.1 },
  'happy':       { valence: 0.9 },
  'party':       { valence: 0.8, danceability: 0.9, energy: 0.8 },
  'summer':      { valence: 0.8, energy: 0.7 },
  
  // TEXTURE
  'electronic':  { acousticness: 0.1 },
  'folk':        { acousticness: 0.8 },
  'piano':       { acousticness: 0.9 },
  'synth':       { acousticness: 0.05 }
};

/**
 * 1. MINE TRACKS (Entry Point)
 * Uses "Multiplexed Search" to distinguish Genre vs Artist vs Title.
 */
export async function mineTracks(seedQuery) {
  console.log(`🌱 SEED MINING: ${seedQuery}`);
  
  // Clean quotes to prevent API errors
  const cleanSeed = seedQuery.replace(/"/g, '');

  // We run 3 parallel searches to interpret the user's intent
  const searches = [
    // PRIORITY 1: Explicit Genre (e.g. "math rock" -> tracks IN that genre)
    { q: `genre:"${cleanSeed}"`, type: 'genre', priority: 1 },
    
    // PRIORITY 2: Explicit Artist (e.g. "The 1975" -> tracks BY that artist)
    { q: `artist:"${cleanSeed}"`, type: 'artist', priority: 2 },
    
    // PRIORITY 3: General/Title (Fallback for specific songs)
    { q: cleanSeed, type: 'general', priority: 3 }
  ];

  // Execute in parallel for speed
  const results = await Promise.all(searches.map(async (s) => {
    try {
      const res = await fetchFromSpotify('search', { 
        q: s.q, 
        type: 'track', 
        limit: 20 // Fetch a small batch from each strategy
      });
      return { ...s, items: res?.tracks?.items || [] };
    } catch (e) {
      return { ...s, items: [] };
    }
  }));

  // Flatten and Prioritize
  const allTracks = [];
  const seenIds = new Set();
  
  // Sort result groups by priority (Genre > Artist > General)
  results.sort((a, b) => a.priority - b.priority);

  for (const group of results) {
    if (group.items.length > 0) {
      console.log(`[Miner] Strategy '${group.type}' found ${group.items.length} tracks.`);
    }
    
    for (const track of group.items) {
      // Deduplicate: If "Math Rock" (song) appears in both General and Genre, keep the first one we saw
      if (!seenIds.has(track.id)) {
        seenIds.add(track.id);
        allTracks.push(track);
      }
    }
  }

  if (allTracks.length === 0) throw new Error("No tracks found.");

  // Hydrate the top N combined results
  return await hydrateTracks(allTracks.slice(0, INITIAL_LIMIT));
}

/**
 * 2. EXPAND POOL (Smart Recommendation Engine)
 * Uses Spotify's 'recommendations' endpoint to find tracks matching specific Audio Features.
 */
export async function expandPool(currentPool, seedQuery, targets = {}) {
  console.log(`⚓ ANCHORED EXPANSION via Recommendations:`, targets);
  
  // 1. Get up to 5 Seed Tracks (Spotify API limit)
  const seedTracks = currentPool
    .slice(0, 5)
    .map(t => t.id)
    .join(',');

  if (!seedTracks) return currentPool;

  // 2. Call Recommendations Endpoint
  const res = await fetchFromSpotify('recommendations', { 
    seed_tracks: seedTracks,
    limit: 50,
    ...targets 
  });
  
  if (!res?.tracks) {
    console.warn("Expansion found nothing.");
    return currentPool;
  }
  
  // 3. Hydrate & Nudge
  const newTracks = await hydrateTracks(res.tracks);
  
  const existingIds = new Set(currentPool.map(t => t.id));
  const uniqueNewTracks = newTracks.filter(t => !existingIds.has(t.id));

  // 4. "Trust" the Source: Apply target stats to the new tracks
  const nudgedTracks = uniqueNewTracks.map(t => {
     const noise = () => (Math.random() * 0.1) - 0.05; 
     
     if (targets.target_valence) t.valence = targets.target_valence + noise();
     if (targets.target_energy) t.energy = targets.target_energy + noise();
     if (targets.target_danceability) t.danceability = targets.target_danceability + noise();
     if (targets.target_acousticness) t.acousticness = targets.target_acousticness + noise();
     
     return t;
  });

  return [...currentPool, ...nudgedTracks];
}

/**
 * 3. THE "VIBE GUESSER" ENGINE (V2)
 * Smartly infers stats from Genres, Tags, and BPM.
 */
function inferVibes(genres = [], tags = []) {
  let stats = {
    energy: 0.5,
    valence: 0.5,
    danceability: 0.5,
    acousticness: 0.3,
    instrumentalness: 0.1
  };

  const combined = [...genres, ...tags]
    .map(t => t.toLowerCase())
    .filter(t => !BLACKLIST.includes(t));

  // A. EXACT KEYWORD MATCHING
  combined.forEach(tag => {
    const weight = KEYWORD_WEIGHTS[tag] || KEYWORD_WEIGHTS[Object.keys(KEYWORD_WEIGHTS).find(k => tag.includes(k))];
    if (weight) {
      if (weight.energy !== undefined) stats.energy = (stats.energy + weight.energy) / 2;
      if (weight.valence !== undefined) stats.valence = (stats.valence + weight.valence) / 2;
      if (weight.danceability !== undefined) stats.danceability = (stats.danceability + weight.danceability) / 2;
      if (weight.acousticness !== undefined) stats.acousticness = (stats.acousticness + weight.acousticness) / 2;
      if (weight.instrumentalness !== undefined) stats.instrumentalness = (stats.instrumentalness + weight.instrumentalness) / 2;
    }
  });

  // B. BPM PARSING (e.g. "140bpm")
  const bpmTag = combined.find(t => t.match(/^\d{2,3}\s*bpm$/));
  if (bpmTag) {
    const bpm = parseInt(bpmTag);
    const normalized = Math.min(Math.max((bpm - 60) / 120, 0), 1);
    stats.energy = (stats.energy + normalized) / 2;
    stats.danceability = (stats.danceability + normalized) / 2;
  }

  // C. TEXTURE FALLBACKS
  const joined = combined.join(' ');
  if (stats.acousticness === 0.3) { 
    if (joined.match(/acoustic|folk|piano|unplugged/)) stats.acousticness = 0.8;
    if (joined.match(/electronic|synth|techno|digital/)) stats.acousticness = 0.1;
  }

  // D. NOISE
  const noise = () => (Math.random() * 0.15) - 0.075;
  Object.keys(stats).forEach(k => {
    stats[k] = Math.max(0, Math.min(1, stats[k] + noise()));
  });

  return stats;
}

/**
 * 4. HYDRATION (Data Merging)
 */
async function hydrateTracks(rawTracks) {
  const cleanRaw = rawTracks.filter(t => t && t.id);
  
  // A. Fetch Spotify Artist Genres
  let artistMap = {};
  try {
    const artistIds = [...new Set(cleanRaw.map(t => t.artists[0]?.id).filter(Boolean))];
    if (artistIds.length > 0) {
      const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
      const batches = chunk(artistIds, 50);
      
      for (const batch of batches) {
        const batchMap = await fetchArtistGenres(batch);
        artistMap = { ...artistMap, ...batchMap };
      }
    }
  } catch (e) { console.warn("Genre fetch failed", e); }

  // B. Process Tracks
  const detailedTracks = await Promise.all(cleanRaw.map(async (track) => {
    const artistName = track.artists?.[0]?.name || "Unknown";
    const trackName = track.name || "Unknown";
    const primaryArtistId = track.artists?.[0]?.id;

    // 1. Get Spotify Genres
    const rawGenres = artistMap[primaryArtistId] || [];
    const genres = rawGenres.map(g => cleanGenre(g)).filter(Boolean);

    // 2. Get Last.fm Tags
    let tags = [];
    try {
      tags = await fetchTrackTags(artistName, trackName);
    } catch (e) {}

    // 3. Infer Vibes
    const vibes = inferVibes(genres, tags);
    
    return {
      id: track.id,
      name: trackName,
      artist: artistName,
      image: track.album?.images?.[0]?.url || null,
      release_date: track.album?.release_date || '2000',
      decade: getDecade(track.album?.release_date),
      genres: [...genres, ...tags], 
      popularity: track.popularity || 0,
      energy: vibes.energy,
      valence: vibes.valence,
      danceability: vibes.danceability,
      acousticness: vibes.acousticness,
      instrumentalness: vibes.instrumentalness,
      duration_ms: track.duration_ms || 0,
      score: 0 
    };
  }));

  return detailedTracks;
}