/**
 * Searches for a specific YouTube Video ID using a public API.
 * This runs entirely in the browser (Client-Side).
 */
export async function fetchVideoId(track) {
  // 1. Construct a specific query
  const query = `${track.artist} - ${track.name}`;
  
  // 2. Use a public Invidious instance (CORS-friendly YouTube API)
  // We use a specific reliable instance, but in production you might rotate these.
  const API_URL = 'https://inv.tux.pizza/api/v1/search';

  try {
    const response = await fetch(`${API_URL}?q=${encodeURIComponent(query)}&type=video&sort=relevance`);
    
    if (!response.ok) throw new Error('Search failed');
    
    const results = await response.json();
    
    if (!results || results.length === 0) return null;

    // 3. THE SIEVE (Regex Filtering)
    // We look for the "Best" video. 
    // Priority: "Lyrics" > "Audio" > "Topic" > Standard
    // We Avoid: "Live", "Cover", "React"
    
    const bestMatch = results.find(video => {
      const title = video.title.toLowerCase();
      const isBad = title.includes('cover') || title.includes('reaction') || title.includes('live at');
      const isGood = title.includes('lyrics') || title.includes('audio') || video.author.includes('Topic');
      return isGood && !isBad;
    }) || results[0]; // Fallback to first result if no "perfect" match

    return bestMatch.videoId;

  } catch (error) {
    console.warn("YouTube ID fetch failed:", error);
    return null; // Fail gracefully
  }
}

export function getYouTubeEmbedUrl(videoId) {
  if (!videoId) return null;
  // Standard, clean embed. No "search" hacks.
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
}

export function getYouTubeLink(track) {
  const q = `${track.artist} - ${track.name}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}