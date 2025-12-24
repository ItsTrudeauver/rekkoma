// --- CONFIGURATION ---
const VIBE_QUESTIONS = [
  { id: 'obscure', text: "Do you want **hidden gems**?", check: t => t.popularity < 30, yesLabel: "Yes, unknown", noLabel: "No, popular" },
  { id: 'sad', text: "Are you feeling **melancholy**?", check: t => t.valence < 0.4, yesLabel: "Yes, sad", noLabel: "No, happy" },
  { id: 'happy', text: "Do you need **uplifting** vibes?", check: t => t.valence > 0.6, yesLabel: "Yes, uplifting", noLabel: "No, moody" },
  { id: 'energy_high', text: "Do you need **high energy**?", check: t => t.energy > 0.65, yesLabel: "Yes, hype", noLabel: "No, chill" },
  { id: 'chill', text: "Do you want to **chill/relax**?", check: t => t.energy < 0.45, yesLabel: "Yes, relax", noLabel: "No, energy" },
  { id: 'dance', text: "Do you want to **dance**?", check: t => t.danceability > 0.65, yesLabel: "Yes, dance", noLabel: "No, sit" },
  { id: 'acoustic', text: "Prefer **acoustic** sounds?", check: t => t.acousticness > 0.5, yesLabel: "Yes, acoustic", noLabel: "No, electric" },
  { id: 'electronic', text: "Prefer **electronic** sounds?", check: t => t.acousticness < 0.2, yesLabel: "Yes, electronic", noLabel: "No, organic" },
  { id: 'vocals', text: "Do you want **vocals**?", check: t => t.instrumentalness < 0.5, yesLabel: "Yes, vocals", noLabel: "No, instrumental" },
  { id: 'long', text: "Do you prefer **long** tracks (> 4 min)?", check: t => t.duration_ms > 240000, yesLabel: "Yes, epic", noLabel: "No, standard" }
];

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- CORE EXPORTS ---

export function getNextQuestion(tracks, askedTags = [], seed = '') {
  // Only stop if we have literally 2 tracks left
  if (tracks.length <= 2) return null;

  const total = tracks.length;
  const candidates = [];
  
  const calculateEntropy = (matchCount) => {
    const p = matchCount / total;
    if (p === 0 || p === 1) return 0; 
    return 1 - Math.abs(0.5 - p) * 2; 
  };

  const isSafeSplit = (matchCount) => {
    const ratio = matchCount / total;
    // RELAXED LOGIC:
    // If pool is small (< 50), allow ANY question that splits at least 1 item off.
    if (total < 50) return ratio > 0 && ratio < 1;
    
    // For larger pools, enforce the 5% rule to avoid wasting time
    if (ratio < 0.05) return false; 
    if (ratio > 0.95) return false; 
    return true;
  };

  // 1. ANALYZE VIBES
  VIBE_QUESTIONS.forEach(q => {
    if (!askedTags.includes(q.id)) {
      const matchCount = tracks.filter(q.check).length;
      if (isSafeSplit(matchCount)) {
        candidates.push({
          type: 'vibe',
          id: q.id,
          value: q.check,
          entropy: calculateEntropy(matchCount), // Prioritize balanced splits
          text: q.text,
          yesLabel: q.yesLabel, 
          noLabel: q.noLabel
        });
      }
    }
  });

  // 2. ANALYZE GENRES
  const genreCounts = {};
  tracks.forEach(t => t.genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
  const seedTerms = seed.split(' ').map(s => s.trim());

  Object.entries(genreCounts).forEach(([genre, count]) => {
    if (askedTags.includes(`genre:${genre}`)) return;
    if (seedTerms.some(term => genre.includes(term))) return; 

    if (isSafeSplit(count)) {
      candidates.push({
        type: 'genre',
        value: genre,
        entropy: calculateEntropy(count),
        text: `Do you want **${capitalize(genre)}** elements?`,
        yesLabel: "Yes",
        noLabel: "No"
      });
    }
  });

  // Sort by Entropy (Balance)
  candidates.sort((a, b) => b.entropy - a.entropy);

  return candidates[0] || null;
}

export function filterTracks(tracks, question, userSaidYes) {
  return tracks.filter(t => {
    if (question.type === 'vibe') {
      const matches = question.value(t);
      return userSaidYes ? matches : !matches;
    } 
    if (question.type === 'genre') {
      const hasGenre = t.genres.includes(question.value);
      return userSaidYes ? hasGenre : !hasGenre;
    }
    return true;
  });
}