import { fetchFromSpotify, fetchArtistGenres } from './spotify';
import { fetchTrackTags } from './lastfm'; 
import { getDecade, cleanGenre } from '../utils/cleaning';
import ALL_GENRES from '../data/all_genres.json';

// --- CONFIGURATION: LIMITS ---
const PER_STRATEGY_LIMIT = 50; 
const INITIAL_LIMIT = 100;
const MAX_SEARCH_DEPTH = 4; 

// --- CONFIGURATION: MOOD EXPANSION ---
const MOOD_EXPANSIONS = {
  'sad': ['indie', 'folk', 'pop', 'acoustic'],
  'chill': ['lo-fi', 'ambient', 'r&b', 'jazz'],
  'happy': ['pop', 'dance', 'rock', 'indie'],
  'party': ['dance', 'hip-hop', 'pop', 'house'],
  'relax': ['ambient', 'classical', 'lo-fi'],
  'focus': ['classical', 'ambient', 'instrumental'],
  'workout': ['hip-hop', 'dance', 'rock', 'metal'],
  'sleep': ['ambient', 'classical', 'piano'],
  'romantic': ['r&b', 'soul', 'pop'],
  'summer': ['pop', 'reggae', 'indie']
};

// --- CONFIGURATION: PREFIX EXPANSION ---
const COUNTRY_ALIASES = {
  'j': 'japanese',
  'k': 'korean',
  'c': 'chinese',
  'v': 'vietnamese',
  't': 'thai',
  'ph': 'philippines',
  'ind': 'indonesian',
  'spa': 'spanish',
  'fr': 'french',
  'uk': 'uk',
  'us': 'usa'
};

// --- CONFIGURATION: VIBE WEIGHTS ---
const BLACKLIST = ['seen live', 'favorites', 'owned', 'my library', 'spotify', 'all', 'favorite', 'albums I own', 'unheard'];

const KEYWORD_WEIGHTS = {
  // HIGH ENERGY / INTENSITY
  'death metal': { energy: 0.9, valence: 0.2 },
  'metalcore':   { energy: 0.9, valence: 0.3 },
  'hyperpop':    { energy: 0.9, danceability: 0.8 },
  'techno':      { energy: 0.8, instrumentalness: 0.7 },
  'drum and bass': { energy: 0.9, danceability: 0.7 },
  'dnb':         { energy: 0.9, danceability: 0.7 },
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

// --- GENRE PARSING ENGINE ---

let GENRE_LOOKUP = null; 
let SORTED_KEYS = null;  

/**
 * Initialize the Fuzzy Matcher
 */
function initializeGenreMap() {
  if (GENRE_LOOKUP) return;

  const map = {};
  
  ALL_GENRES.forEach(rawGenre => {
    const synonyms = rawGenre.split('/').map(s => s.trim());
    
    synonyms.forEach(canonical => {
      const lower = canonical.toLowerCase();
      const withAnd = lower.replace(/&/g, 'and');
      
      const variations = new Set([
        lower,                                      
        withAnd,                                    
        lower.replace(/\s+/g, ''),                  
        lower.replace(/\s+/g, '-'),                 
        withAnd.replace(/\s+/g, ''),                
        withAnd.replace(/\s+/g, '-')                
      ]);

      variations.forEach(v => {
        if (v.length > 2) { 
          map[v] = canonical; 
        }
      });
    });
  });

  GENRE_LOOKUP = map;
  SORTED_KEYS = Object.keys(map).sort((a, b) => b.length - a.length);
}

/**
 * Fisher-Yates Shuffle
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Check for Country Prefixes (j-rock, k-pop)
 */
function checkPrefix(term, map) {
  const match = term.match(/\b([a-z]{1,3})-([a-z]+)\b/i);
  if (!match) return null;

  const prefix = match[1].toLowerCase();
  const stem = match[2].toLowerCase();

  if (COUNTRY_ALIASES[prefix] && map[stem]) {
    return {
      country: COUNTRY_ALIASES[prefix],
      genre: map[stem],
      originalTerm: match[0]
    };
  }
  return null;
}

/**
 * Main Query Parser
 */
function parseSearchIntent(rawQuery) {
  initializeGenreMap();

  let cleanQuery = rawQuery.toLowerCase().replace(/"/g, '').trim();

  // --- RELEVANCE FIX START ---
  
  // 1. STANDARD GENRE MATCH (PRIORITY)
  // We check this FIRST now. If "j-pop" exists as a genre, we use it strictly.
  // This prevents "j-pop" from being split into "japanese" + "pop" (which matches "Japanese Denim").
  const findGenre = (text) => {
    for (const key of SORTED_KEYS) {
      const regex = new RegExp(`(^|\\s|\\-|\\.)${key}($|\\s|\\-|\\.)`, 'i');
      if (regex.test(text)) {
        return {
          genreKey: key,
          canonicalGenre: GENRE_LOOKUP[key],
          descriptor: text.replace(key, '').replace(/\s\s+/g, ' ').trim()
        };
      }
    }
    return null;
  };

  let match = findGenre(cleanQuery);

  if (match) {
    return {
      query: `${match.descriptor} genre:"${match.canonicalGenre}"`.trim(),
      type: 'intent_genre',
      genreFound: match.canonicalGenre,
      descriptor: match.descriptor
    };
  }
  
  // 2. PREFIX INTERCEPTOR (FALLBACK)
  // We only do this if we DIDN'T find a strict genre match.
  // e.g., "j-shoegaze" (if not in DB) -> "japanese shoegaze"
  const prefixMatch = checkPrefix(cleanQuery, GENRE_LOOKUP);
  if (prefixMatch) {
    const descriptor = cleanQuery.replace(prefixMatch.originalTerm, '').trim();
    return {
      query: `${prefixMatch.country} ${descriptor} genre:"${prefixMatch.genre}"`.trim(),
      type: 'intent_prefix',
      genreFound: prefixMatch.genre,
      descriptor: `${prefixMatch.country} ${descriptor}`.trim()
    };
  }

  // 3. FALLBACK EXPANSION (e.g. "j indie" -> "japanese indie")
  // This helps when users type loosely.
  let expanded = cleanQuery;
  Object.entries(COUNTRY_ALIASES).forEach(([alias, full]) => {
    const aliasRegex = new RegExp(`\\b${alias}\\s`, 'g'); 
    expanded = expanded.replace(aliasRegex, `${full} `);
  });
    
  if (expanded !== cleanQuery) {
    match = findGenre(expanded);
    if (match) {
      match.descriptor = expanded.replace(match.genreKey, '').replace(/\s\s+/g, ' ').trim();
      return {
        query: `${match.descriptor} genre:"${match.canonicalGenre}"`.trim(),
        type: 'intent_genre',
        genreFound: match.canonicalGenre,
        descriptor: match.descriptor
      };
    } else {
      cleanQuery = expanded;
    }
  }

  // --- RELEVANCE FIX END ---

  return null;
}

/**
 * ANTI-ECHO FILTER
 */
function filterEchoes(tracks, descriptor) {
  if (!descriptor || descriptor.length < 3) return tracks;

  const ECHO_CAP = 3; 
  const keyword = descriptor.toLowerCase();

  const echoes = [];
  const implicit = [];

  tracks.forEach(t => {
    if (t.name.toLowerCase().includes(keyword)) {
      echoes.push(t);
    } else {
      implicit.push(t);
    }
  });

  const topEchoes = echoes.slice(0, ECHO_CAP);
  const bottomEchoes = echoes.slice(ECHO_CAP);

  return [...topEchoes, ...implicit, ...bottomEchoes];
}

/**
 * 1. MINE TRACKS (Entry Point)
 */
export async function mineTracks(seedQuery, popRange = { min: 0, max: 100 }) {
  console.log(`🌱 SEED MINING: ${seedQuery} | Pop: ${popRange.min}-${popRange.max}`);
  
  const cleanSeed = seedQuery.replace(/"/g, '').toLowerCase();
  initializeGenreMap();
  
  const intent = parseSearchIntent(cleanSeed);
  const searches = [];
  let echoDescriptor = cleanSeed; 

  // STRATEGY A: Explicit Genre/Intent Found
  if (intent) {
    searches.push({ q: intent.query, type: 'intent_genre', priority: 0 });
    echoDescriptor = intent.descriptor; 
  } 
  // STRATEGY B: Pure Mood
  else {
    const detectedMood = Object.keys(MOOD_EXPANSIONS).find(mood => cleanSeed.includes(mood));
    if (detectedMood) {
      MOOD_EXPANSIONS[detectedMood].forEach(genre => {
        searches.push({ 
          q: `${cleanSeed} genre:${genre}`, 
          type: `mood_${detectedMood}_${genre}`, 
          priority: 0 
        });
      });
      echoDescriptor = detectedMood;
    }
  }

  // STRATEGY C: Standard Fallbacks
  // If we found a strict intent, we assign lower priority to general fallbacks
  // to prevent "polluting" the pool with keyword matches.
  searches.push(
    { q: `genre:"${cleanSeed}"`, type: 'genre', priority: 1 },
    { q: `artist:"${cleanSeed}"`, type: 'artist', priority: 2 },
    { q: cleanSeed, type: 'general', priority: 3 }
  );

  const seenIds = new Set();
  const allValidTracks = [];
  
  let offset = 0;
  let keepSearching = true;
  let depth = 0;

  // LOOP: Fetch pages until we have enough tracks in the target popularity range
  while (keepSearching && allValidTracks.length < INITIAL_LIMIT && depth < MAX_SEARCH_DEPTH) {
    
    // Run all strategies in parallel
    const batchResults = await Promise.all(searches.map(async (s) => {
      try {
        const res = await fetchFromSpotify('search', { 
          q: s.q, 
          type: 'track', 
          limit: PER_STRATEGY_LIMIT,
          offset: offset 
        });
        
        return { 
          ...s, 
          items: res?.tracks?.items || [],
          total: res?.tracks?.total || 0 
        };
      } catch (e) {
        return { ...s, items: [], total: 0 };
      }
    }));

    let tracksInThisBatch = 0;
    
    // Sort by priority to favor strict genre matches
    batchResults.sort((a, b) => a.priority - b.priority);

    for (const group of batchResults) {
      for (const track of group.items) {
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);

          // FILTER: Pop Range
          if (track.popularity >= popRange.min && track.popularity <= popRange.max) {
            allValidTracks.push(track);
            tracksInThisBatch++;
          }
        }
      }
    }

    const totalResultsFound = batchResults.reduce((sum, r) => sum + r.items.length, 0);

    if (totalResultsFound === 0) {
      keepSearching = false; 
    } else {
      depth++;
      offset += PER_STRATEGY_LIMIT; 
      console.log(`[Miner] Page ${depth}: Found ${tracksInThisBatch} valid tracks.`);
    }
  }

  if (allValidTracks.length === 0) throw new Error("No tracks found in that popularity range.");

  // --- 1. APPLY ANTI-ECHO FILTER ---
  const filteredTracks = filterEchoes(allValidTracks, echoDescriptor);

  // --- 2. SELECT CANDIDATES ---
  const topCandidates = filteredTracks.slice(0, INITIAL_LIMIT);

  // --- 3. INJECT ENTROPY ---
  const shuffledCandidates = shuffleArray(topCandidates);

  return await hydrateTracks(shuffledCandidates);
}

/**
 * 2. EXPAND POOL
 */
export async function expandPool(currentPool, seedQuery, targets = {}) {
  console.log(`⚓ ANCHORED EXPANSION via Recommendations:`, targets);
  
  const seedTracks = currentPool
    .slice(0, 5)
    .map(t => t.id)
    .join(',');

  if (!seedTracks) return currentPool;

  const res = await fetchFromSpotify('recommendations', { 
    seed_tracks: seedTracks,
    limit: 50,
    ...targets 
  });
  
  if (!res?.tracks) {
    console.warn("Expansion found nothing.");
    return currentPool;
  }
  
  const newTracks = await hydrateTracks(res.tracks);
  
  const existingIds = new Set(currentPool.map(t => t.id));
  const uniqueNewTracks = newTracks.filter(t => !existingIds.has(t.id));

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
 * 3. THE "VIBE GUESSER" ENGINE
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

  // B. BPM PARSING
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
      
      // Fix: Deduplicate genres to prevent React unique key errors
      genres: [...new Set([...genres, ...tags])], 
      
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