import ARCHETYPES from '../data/archetypes.json';

// --- CONFIGURATION ---
const VIBE_QUESTIONS = [
  // REMOVED: { id: 'obscure', ... } -> Now handled by SearchInput sliders.
  { id: 'sad', text: "Are you feeling **melancholy**?", check: t => t.valence < 0.4 },
  { id: 'happy', text: "Do you need **uplifting** vibes?", check: t => t.valence > 0.6 },
  { id: 'energy_high', text: "Do you need **high energy**?", check: t => t.energy > 0.65 },
  { id: 'chill', text: "Do you want to **chill/relax**?", check: t => t.energy < 0.45 },
  { id: 'dance', text: "Is this for **dancing**?", check: t => t.danceability > 0.65 },
  { id: 'acoustic', text: "Do you prefer **acoustic** sounds?", check: t => t.acousticness > 0.5 },
  { id: 'electronic', text: "Do you prefer **electronic** sounds?", check: t => t.acousticness < 0.2 },
  { id: 'vocals', text: "Do you want **vocals**?", check: t => t.instrumentalness < 0.5 },
  { id: 'long', text: "Do you prefer **long** tracks (> 4 min)?", check: t => t.duration_ms > 240000 }
];

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper: Calculate how well a track fits an archetype (0.0 to 1.0)
function getArchetypeMatchRatio(track, conditions) {
  const entries = Object.entries(conditions);
  if (entries.length === 0) return 0;

  let matches = 0;
  for (const [key, bounds] of entries) {
    const val = track[key];
    if (val === undefined) continue;

    let hit = true;
    if (bounds.min !== undefined && val < bounds.min) hit = false;
    if (bounds.max !== undefined && val > bounds.max) hit = false;
    if (hit) matches++;
  }
  return matches / entries.length;
}

// --- CORE EXPORTS ---

export function getNextQuestion(tracks, askedTags = [], seed = '') {
  if (tracks.length <= 1) return null;

  const total = tracks.length;
  const candidates = [];
  
  const calculateEntropy = (matchCount) => {
    const p = matchCount / total;
    if (p <= 0 || p >= 1) return 0; 
    return 1 - Math.abs(0.5 - p) * 2; 
  };

  const isSafeSplit = (matchCount) => {
    const ratio = matchCount / total;
    if (total < 20) return ratio > 0 && ratio < 1; 
    return ratio > 0.05 && ratio < 0.95; 
  };

  // 1. VIBE QUESTIONS
  VIBE_QUESTIONS.forEach(q => {
    if (!askedTags.includes(q.id)) {
      const matchCount = tracks.filter(q.check).length;
      if (isSafeSplit(matchCount)) {
        candidates.push({
          type: 'vibe',
          id: q.id,
          value: q.check,
          entropy: calculateEntropy(matchCount),
          text: q.text
        });
      }
    }
  });

  // 2. ARCHETYPE QUESTIONS
  ARCHETYPES.forEach(arch => {
    if (!askedTags.includes(arch.id)) {
      const matchCount = tracks.filter(t => getArchetypeMatchRatio(t, arch.conditions) >= 0.7).length;
      
      if (isSafeSplit(matchCount)) {
        candidates.push({
          type: 'archetype',
          id: arch.id,
          conditions: arch.conditions,
          entropy: calculateEntropy(matchCount),
          text: arch.text
        });
      }
    }
  });

  // 3. GENRE QUESTIONS
  const genreCounts = {};
  tracks.forEach(t => t.genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
  const seedTerms = seed.split(' ').map(s => s.trim());

  Object.entries(genreCounts).forEach(([genre, count]) => {
    const genreId = `genre:${genre}`;
    if (askedTags.includes(genreId)) return;
    if (seedTerms.some(term => genre.includes(term))) return; 

    if (isSafeSplit(count)) {
      candidates.push({
        type: 'genre',
        id: genreId, 
        value: genre,
        entropy: calculateEntropy(count),
        text: `Do you want **${capitalize(genre)}** elements?`
      });
    }
  });

  // 4. ENTROPIC SELECTION
  candidates.sort((a, b) => b.entropy - a.entropy);
  
  const TOP_N = 5;
  const validOptions = candidates.slice(0, TOP_N);

  if (validOptions.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * validOptions.length);
  return validOptions[randomIndex];
}

export function updateTrackScores(tracks, question, userSaidYes) {
  return tracks.map(t => {
    const currentScore = t.score || 0;
    let change = 0;

    if (question.type === 'archetype') {
      const matchRatio = getArchetypeMatchRatio(t, question.conditions);
      if (userSaidYes) {
        if (matchRatio === 1.0) change = 3;       
        else if (matchRatio >= 0.6) change = 1;   
        else change = -2;                         
      } else {
        if (matchRatio === 1.0) change = -3;      
        else if (matchRatio >= 0.6) change = -1;  
        else change = 1;                          
      }
    } 
    else {
      let isMatch = false;
      if (question.type === 'vibe') isMatch = question.value(t);
      if (question.type === 'genre') isMatch = t.genres.includes(question.value);

      if (userSaidYes) {
        change = isMatch ? 1 : -1;
      } else {
        change = isMatch ? -1 : 1;
      }
    }

    return { ...t, score: currentScore + change };
  });
}