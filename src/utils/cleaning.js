// src/utils/cleaning.js

// A small blacklist of garbage tags that aren't genres
const JUNK_TAGS = [
  'seen live', 'favorites', 'owned', 'my library', 'spotify', 
  'all', 'favorite', 'albums I own', 'unheard'
];

export function cleanGenre(rawGenre) {
  if (!rawGenre) return null;
  
  // 1. Basic normalization
  let clean = rawGenre.toLowerCase().trim();

  // 2. Remove Junk
  if (JUNK_TAGS.includes(clean)) return null;

  // 3. Synonym Mapping (Only for identical things)
  // We don't flatten subgenres, just fix spelling.
  if (clean === 'hip-hop') return 'hip hop';
  if (clean === 'r&b') return 'r&b'; 
  if (clean === 'drum and bass') return 'dnb';

  // 4. "Trust the Source"
  // We return the specific genre (e.g., "math rock")
  // The mining engine (inferVibes) will still detect "rock" inside "math rock" 
  // via substring matching, so stats won't break.
  return clean;
}

export function getDecade(releaseDate) {
  if (!releaseDate) return 'Unknown';
  const year = parseInt(releaseDate.split('-')[0]);
  if (isNaN(year)) return 'Unknown';

  if (year >= 2020) return '2020s';
  if (year >= 2010) return '2010s';
  if (year >= 2000) return '2000s';
  if (year >= 1990) return '90s';
  if (year >= 1980) return '80s';
  if (year >= 1970) return '70s';
  return 'Classics';
}