import { fetchFromSpotify, fetchArtistGenres } from './spotify';
import { fetchTrackTags } from './lastfm'; 
import { getDecade, cleanGenre } from '../utils/cleaning';
import ALL_GENRES from '../data/all_genres.json';

// --- CONFIGURATION: LIMITS ---
const PER_STRATEGY_LIMIT = 50; 
const INITIAL_LIMIT = 200;
const MAX_SEARCH_DEPTH = 4; 

// --- CONFIGURATION: COMMUNITY BLOCKLIST ---
const BLOCKLIST_URL = "https://raw.githubusercontent.com/romiem/ai-bands/main/dist/artists.json";
let BLOCKED_IDS = new Set();
let IS_BLOCKLIST_LOADED = false;

// --- CONFIGURATION: FALLBACK HEURISTICS ---
// (Kept as a safety net for brand new bots not yet on the list)
const SUSPICIOUS_PATTERNS = [
  /user\d+/i,        // e.g. "User12938"
  /^artist\s?\d+$/i, // e.g. "Artist 5"
  /sped up/i,        // Low quality "Sped Up" versions
  /slowed.*reverb/i  // Low quality "Slowed" versions
];

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
  'j': 'japanese', 'k': 'korean', 'c': 'chinese', 'v': 'vietnamese',
  't': 'thai', 'ph': 'philippines', 'ind': 'indonesian', 'spa': 'spanish',
  'fr': 'french', 'uk': 'uk', 'us': 'usa'
};

const KEYWORD_WEIGHTS = {
  'death metal': { energy: 0.9, valence: 0.2 },
  'metalcore':   { energy: 0.9, valence: 0.3 },
  'hyperpop':    { energy: 0.9, danceability: 0.8 },
  'techno':      { energy: 0.8, instrumentalness: 0.7 },
  'drum and bass': { energy: 0.9, danceability: 0.7 },
  'dnb':         { energy: 0.9, danceability: 0.7 },
  'rock':        { energy: 0.6 },
  'gym':         { energy: 0.8, valence: 0.6 },
  'running':     { energy: 0.8 },
  'ambient':     { energy: 0.1, instrumentalness: 0.9, acousticness: 0.4 },
  'ballad':      { energy: 0.3, danceability: 0.2, valence: 0.3 },
  'lo-fi':       { energy: 0.2, acousticness: 0.6, valence: 0.5 },
  'acoustic':    { energy: 0.3, acousticness: 0.9 },
  'sleep':       { energy: 0.1, valence: 0.5 },
  'sad':         { valence: 0.1 }, 'depressing': { valence: 0.1 },
  'heartbreak':  { valence: 0.2 }, 'cry': { valence: 0.1 },
  'happy':       { valence: 0.9 }, 'party': { valence: 0.8, danceability: 0.9, energy: 0.8 },
  'summer':      { valence: 0.8, energy: 0.7 },
  'electronic':  { acousticness: 0.1 }, 'folk': { acousticness: 0.8 },
  'piano':       { acousticness: 0.9 }, 'synth': { acousticness: 0.05 }
};

const BLACKLIST_TAGS = ['seen live', 'favorites', 'owned', 'my library', 'spotify', 'all', 'favorite', 'albums I own', 'unheard'];

// --- HELPERS ---

let GENRE_LOOKUP = null; 
let SORTED_KEYS = null;  

function initializeGenreMap() {
  if (GENRE_LOOKUP) return;
  const map = {};
  ALL_GENRES.forEach(rawGenre => {
    const synonyms = rawGenre.split('/').map(s => s.trim());
    synonyms.forEach(canonical => {
      const lower = canonical.toLowerCase();
      const withAnd = lower.replace(/&/g, 'and');
      const variations = new Set([
        lower, withAnd, lower.replace(/\s+/g, ''), lower.replace(/\s+/g, '-'), 
        withAnd.replace(/\s+/g, ''), withAnd.replace(/\s+/g, '-')
      ]);
      variations.forEach(v => {
        if (v.length > 2) map[v] = canonical; 
      });
    });
  });
  GENRE_LOOKUP = map;
  SORTED_KEYS = Object.keys(map).sort((a, b) => b.length - a.length);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * 🛠️ INITIALIZE BLOCKLIST
 * Fetches the community JSON and parses Artist IDs
 */
async function initializeBlocklist() {
  if (IS_BLOCKLIST_LOADED) return;
  
  try {
    const res = await fetch(BLOCKLIST_URL);
    if (!res.ok) throw new Error("Failed to fetch blocklist");
    
    const data = await res.json();
    const ids = new Set();

    data.forEach(item => {
      // Logic adapted from the uploaded extension code
      if (item && item.spotify) {
        // Match raw ID or extract from URL (e.g., /artist/4Z8W4fKeB5YxbusRsdQVPb)
        const match = item.spotify.match(/([a-zA-Z0-9]{22})/);
        if (match) {
          ids.add(match[1]);
        }
      }
    });

    BLOCKED_IDS = ids;
    IS_BLOCKLIST_LOADED = true;
    console.log(`🛡️ AI Blocklist Loaded: ${BLOCKED_IDS.size} artists blocked.`);
  } catch (e) {
    console.warn("Could not load AI blocklist, falling back to heuristics.", e);
  }
}

/**
 * 🔍 SPAM DETECTOR
 * Checks both the Community Blocklist AND Heuristics
 */
function isSpam(artistId, artistName) {
  // 1. Check Community Blocklist (ID based - 100% accurate)
  if (artistId && BLOCKED_IDS.has(artistId)) {
    console.log(`🚫 Blocked AI Artist (Community List): ${artistName}`);
    return true;
  }

  // 2. Check Heuristics (Name based - fallback)
  if (artistName) {
    const cleanName = artistName.toLowerCase().trim();
    if (SUSPICIOUS_PATTERNS.some(p => p.test(cleanName))) {
      console.log(`⚠️ Blocked Suspicious Name: ${artistName}`);
      return true;
    }
  }

  return false;
}

function checkPrefix(term, map) {
  const match = term.match(/\b([a-z]{1,3})-([a-z]+)\b/i);
  if (!match) return null;

  const fullTerm = match[0].toLowerCase();
  if (map[fullTerm]) return null;

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

function parseSearchIntent(rawQuery) {
  initializeGenreMap();
  let cleanQuery = rawQuery.toLowerCase().replace(/"/g, '').trim();

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

  return null;
}

function filterEchoes(tracks, descriptor) {
  if (!descriptor || descriptor.length < 3) return tracks;
  const ECHO_CAP = 3; // Max number of "direct matches" allowed at the top
  const keyword = descriptor.toLowerCase();
  
  const echoes = [];
  const implicit = [];

  tracks.forEach(t => {
    const trackNameMatches = t.name.toLowerCase().includes(keyword);
    // ✅ ADDED: Check artist name as well
    const artistNameMatches = t.artist.toLowerCase().includes(keyword);

    if (trackNameMatches || artistNameMatches) {
      echoes.push(t);
    } else {
      implicit.push(t);
    }
  });

  const topEchoes = echoes.slice(0, ECHO_CAP);
  const bottomEchoes = echoes.slice(ECHO_CAP);

  // Puts non-matching ("implicit") tracks first, limiting obvious name matches
  return [...topEchoes, ...implicit, ...bottomEchoes];
}

/**
 * 1. MINE TRACKS
 */
export async function mineTracks(seedQuery, popRange = { min: 0, max: 100 }) {
  console.log(`🌱 SEED MINING: ${seedQuery} | Pop: ${popRange.min}-${popRange.max}`);
  
  // Ensure blocklist is ready before we start
  await initializeBlocklist();
  
  const cleanSeed = seedQuery.replace(/"/g, '').toLowerCase();
  initializeGenreMap();
  
  const intent = parseSearchIntent(cleanSeed);
  const searches = [];
  let echoDescriptor = cleanSeed; 
  let anchoredGenre = null;

  if (intent) {
    searches.push({ q: intent.query, type: 'intent_genre', priority: 0 });
    echoDescriptor = intent.descriptor; 
    anchoredGenre = intent.genreFound;
  } else {
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

  while (keepSearching && allValidTracks.length < INITIAL_LIMIT && depth < MAX_SEARCH_DEPTH) {
    const batchResults = await Promise.all(searches.map(async (s) => {
      try {
        const res = await fetchFromSpotify('search', { 
          q: s.q, 
          type: 'track', 
          limit: PER_STRATEGY_LIMIT,
          offset: offset 
        });
        return { ...s, items: res?.tracks?.items || [], total: res?.tracks?.total || 0 };
      } catch (e) {
        return { ...s, items: [], total: 0 };
      }
    }));

    let tracksInThisBatch = 0;
    batchResults.sort((a, b) => a.priority - b.priority);

    for (const group of batchResults) {
      for (const track of group.items) {
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          
          // [FIX] Check ID against Blocklist
          const artistName = track.artists?.[0]?.name;
          const artistId = track.artists?.[0]?.id;
          
          if (isSpam(artistId, artistName)) continue;

          if (track.popularity >= popRange.min && track.popularity <= popRange.max) {
            allValidTracks.push(track);
            tracksInThisBatch++;
          }
        }
      }
    }

    const totalResultsFound = batchResults.reduce((sum, r) => sum + r.items.length, 0);
    if (totalResultsFound === 0) keepSearching = false; 
    else {
      depth++;
      offset += PER_STRATEGY_LIMIT; 
      console.log(`[Miner] Page ${depth}: Found ${tracksInThisBatch} valid tracks.`);
    }
  }

  if (allValidTracks.length === 0) throw new Error("No tracks found. Try widening the sliders.");

  const filteredTracks = filterEchoes(allValidTracks, echoDescriptor);
  const topCandidates = filteredTracks.slice(0, INITIAL_LIMIT);
  const shuffledCandidates = shuffleArray(topCandidates);
  
  // Hydrate with full details
  let hydrated = await hydrateTracks(shuffledCandidates);

  // [FIX] Anchoring: Loose filtering based on genre (Optional cleanup)
  if (anchoredGenre) {
    const strictFiltered = hydrated.filter(t => {
      // Allow if artist has NO genres (might be new/indie)
      if (t.genres.length === 0) return true;
      // Allow if ANY of the artist's genres fuzzy match the anchor
      return t.genres.some(g => g.includes(anchoredGenre) || anchoredGenre.includes(g));
    });
    if (strictFiltered.length >= 10) hydrated = strictFiltered;
  }

  return { tracks: hydrated, anchor: anchoredGenre };
}

/**
 * 2. EXPAND POOL
 */
export async function expandPool(currentPool, seedQuery, targets = {}, anchorGenre = null) {
  console.log(`⚓ ANCHORED EXPANSION:`, targets, `Anchor: ${anchorGenre}`);
  
  // Ensure blocklist is loaded (just in case)
  await initializeBlocklist();

  const seedTracks = currentPool.slice(0, 5).map(t => t.id).join(',');
  if (!seedTracks) return currentPool;

  const res = await fetchFromSpotify('recommendations', { 
    seed_tracks: seedTracks,
    limit: 50,
    ...targets 
  });
  
  if (!res?.tracks) return currentPool;
  
  const newTracks = await hydrateTracks(res.tracks);
  
  let validTracks = newTracks;
  if (anchorGenre) {
    const anchored = newTracks.filter(t => 
      // Filter out spam (ID check)
      !isSpam(t.artists?.[0]?.id, t.artist) && 
      // Ensure genre consistency
      (t.genres.length === 0 || t.genres.some(g => g.includes(anchorGenre) || anchorGenre.includes(g)))
    );
    if (anchored.length >= 5) validTracks = anchored;
  }

  const existingIds = new Set(currentPool.map(t => t.id));
  const uniqueNewTracks = validTracks.filter(t => !existingIds.has(t.id));

  const nudgedTracks = uniqueNewTracks.map(t => {
     const noise = () => (Math.random() * 0.1) - 0.05; 
     if (targets.target_valence) t.valence = targets.target_valence + noise();
     if (targets.target_energy) t.energy = targets.target_energy + noise();
     return t;
  });

  return [...currentPool, ...nudgedTracks];
}

function inferVibes(genres = [], tags = []) {
  let stats = { energy: 0.5, valence: 0.5, danceability: 0.5, acousticness: 0.3, instrumentalness: 0.1 };
  const combined = [...genres, ...tags].map(t => t.toLowerCase()).filter(t => !BLACKLIST_TAGS.includes(t));
  
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
  return stats;
}

async function hydrateTracks(rawTracks) {
  const cleanRaw = rawTracks.filter(t => t && t.id);
  
  let artistMap = {};
  try {
    const artistIds = [...new Set(cleanRaw.map(t => t.artists[0]?.id).filter(Boolean))];
    if (artistIds.length > 0) {
      const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
      for (const batch of chunk(artistIds, 50)) {
        const batchMap = await fetchArtistGenres(batch);
        artistMap = { ...artistMap, ...batchMap };
      }
    }
  } catch (e) { console.warn("Genre fetch failed", e); }

  const detailedTracks = await Promise.all(cleanRaw.map(async (track) => {
    const artistName = track.artists?.[0]?.name || "Unknown";
    const artistId = track.artists?.[0]?.id;

    // [FIX] Double check blocklist here too
    if (isSpam(artistId, artistName)) return null;

    const trackName = track.name || "Unknown";
    const primaryArtistId = track.artists?.[0]?.id;
    const rawGenres = artistMap[primaryArtistId] || [];
    const genres = rawGenres.map(g => cleanGenre(g)).filter(Boolean);
    
    let tags = [];
    try { tags = await fetchTrackTags(artistName, trackName); } catch (e) {}

    const vibes = inferVibes(genres, tags);
    
    return {
      id: track.id,
      name: trackName,
      artist: artistName,
      image: track.album?.images?.[0]?.url || null,
      release_date: track.album?.release_date || '2000',
      decade: getDecade(track.album?.release_date),
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

  return detailedTracks.filter(Boolean);
}