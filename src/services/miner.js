import { fetchFromSpotify, fetchArtistGenres } from './spotify';
import { getDecade, cleanGenre } from '../utils/cleaning';

const INITIAL_LIMIT = 50; 
const EXPANSION_LIMIT = 50; 

export async function mineTracks(seedQuery) {
  console.log(`🌱 SEED MINING: ${seedQuery}`);
  const res = await fetchFromSpotify('search', { q: seedQuery, type: 'track', limit: INITIAL_LIMIT });
  if (!res?.tracks?.items?.length) throw new Error("No tracks found.");
  return await hydrateTracks(res.tracks.items);
}

export async function expandPool(currentPool, genre, seedQuery) {
  console.log(`⚓ ANCHORED EXPANSION: "${seedQuery}" + Genre: "${genre}"`);
  const query = `${seedQuery} genre:"${genre}"`;
  
  const res = await fetchFromSpotify('search', { q: query, type: 'track', limit: EXPANSION_LIMIT });
  
  if (!res?.tracks?.items) {
    console.warn("Expansion found nothing.");
    return currentPool;
  }
  
  const newTracks = await hydrateTracks(res.tracks.items);
  const existingIds = new Set(currentPool.map(t => t.id));
  const uniqueNewTracks = newTracks.filter(t => !existingIds.has(t.id));
  
  return [...currentPool, ...uniqueNewTracks];
}

// --- HEURISTIC ENGINE (The "Vibe Guesser") ---
function inferVibes(genres = []) {
  // Default: Mid-tempo, neutral mood
  let stats = {
    energy: 0.5,
    valence: 0.5,
    danceability: 0.5,
    acousticness: 0.1,
    instrumentalness: 0.1
  };

  const g = genres.join(' ').toLowerCase();

  // 1. ENERGY / DANCE
  if (g.match(/rock|metal|punk|hyper|club|dance|edm|house|techno|upbeat|pop/)) {
    stats.energy += 0.3;
    stats.danceability += 0.2;
  }
  if (g.match(/chill|ambient|lo-fi|slow|ballad|acoustic|folk|piano|sleep/)) {
    stats.energy -= 0.3;
    stats.danceability -= 0.2;
  }

  // 2. VALENCE (Mood)
  if (g.match(/sad|melancholy|dark|goth|emo|blues|noir|depressive/)) {
    stats.valence -= 0.3;
  }
  if (g.match(/happy|upbeat|kawaii|sunny|fun|party|disco/)) {
    stats.valence += 0.3;
  }

  // 3. ACOUSTIC / INSTRUMENTAL
  if (g.match(/acoustic|folk|unplugged|piano|classical|orchestra/)) {
    stats.acousticness = 0.8;
  }
  if (g.match(/instrumental|post-rock|ambient|soundtrack|score|beats/)) {
    stats.instrumentalness = 0.8;
  }
  
  // Clamp values between 0 and 1
  Object.keys(stats).forEach(k => {
    stats[k] = Math.max(0, Math.min(1, stats[k]));
  });

  // Add random jitter so "Sad?" doesn't split the pool perfectly evenly every time
  // This feels more organic
  const jitter = () => (Math.random() * 0.1) - 0.05;
  stats.energy += jitter();
  stats.valence += jitter();

  return stats;
}

async function hydrateTracks(rawTracks) {
  const cleanRaw = rawTracks.filter(t => t && t.id);
  
  // 1. Fetch Genres (Critical for inference)
  let artistMap = {};
  try {
    const artistIds = [...new Set(cleanRaw.map(t => t.artists[0]?.id).filter(Boolean))];
    if (artistIds.length > 0) {
      artistMap = await fetchArtistGenres(artistIds);
    }
  } catch (e) { console.warn("Genre fetch failed"); }

  // 2. Map Data & Infer Vibes
  return cleanRaw.map(track => {
    const primaryArtistId = track.artists?.[0]?.id;
    const rawGenres = artistMap[primaryArtistId] || [];
    const genres = rawGenres.map(g => cleanGenre(g)).filter(Boolean);
    
    // HERE IS THE FIX: We calculate vibes locally instead of fetching
    const vibes = inferVibes(genres);
    
    return {
      id: track.id,
      name: track.name || "Unknown",
      artist: track.artists?.[0]?.name || "Unknown",
      image: track.album?.images?.[0]?.url || null,
      release_date: track.album?.release_date || '2000',
      decade: getDecade(track.album?.release_date),
      genres: genres,
      popularity: track.popularity || 0,
      
      // Use Inferred Stats
      energy: vibes.energy,
      valence: vibes.valence,
      danceability: vibes.danceability,
      acousticness: vibes.acousticness,
      instrumentalness: vibes.instrumentalness,
      duration_ms: track.duration_ms || 0
    };
  });
}