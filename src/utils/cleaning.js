/**
 * Normalizes genre strings to ensure consistent grouping.
 * e.g., "alternative rock" -> "rock"
 * e.g., "k-pop" -> "k-pop"
 */

// We map specific sub-genres to broader "Macro Genres" for better questions
const MACRO_GENRES = {
  'rock': ['rock', 'punk', 'metal', 'grunge', 'indie rock'],
  'pop': ['pop', 'indie pop', 'k-pop', 'j-pop', 'electropop'],
  'electronic': ['electronic', 'techno', 'house', 'edm', 'synth', 'ambient'],
  'hip-hop': ['hip hop', 'rap', 'trap', 'r&b', 'drill'],
  'jazz': ['jazz', 'bebop', 'swing', 'soul', 'blues'],
  'classical': ['classical', 'orchestra', 'piano', 'opera'],
  'folk': ['folk', 'country', 'singer-songwriter', 'acoustic'],
};

export function cleanGenre(rawGenre) {
  if (!rawGenre) return null;
  const lower = rawGenre.toLowerCase().trim();

  // 1. Check for Macro Genre matches
  for (const [macro, subs] of Object.entries(MACRO_GENRES)) {
    if (lower.includes(macro) || subs.some(s => lower.includes(s))) {
      return macro; // Normalize "indie rock" -> "rock"
    }
  }

  // 2. Fallback: Return the raw genre if it's distinct enough (e.g., "reggae")
  return lower;
}

/**
 * Extracts a "Decade" tag from a release date string (YYYY-MM-DD).
 */
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