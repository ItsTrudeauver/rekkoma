/**
 * OFFICIAL YouTube Data API implementation (Debug Version).
 */

// REPLACE THIS WITH YOUR NEW KEY
const YOUTUBE_API_KEY = 'AIzaSyBUUmgA5y3OQnOJL_H3gldbklZYqvZleNw'; 

export async function fetchVideoId(track) {
  const query = `${track.artist} - ${track.name}`;
  console.log(`[YouTube] Searching for: ${query}`);

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // 1. CATCH API ERRORS (Quota, Not Enabled, etc.)
    if (data.error) {
      console.error("❌ YouTube API Error Details:", data.error);
      alert(`YouTube API Error: ${data.error.message}\n(Check Console for details)`);
      return null;
    }

    // 2. CHECK EMPTY RESULTS
    if (!data.items || data.items.length === 0) {
      console.warn(`⚠️ No results found for: ${query}`);
      return null;
    }

    // 3. SUCCESS
    const videoId = data.items[0].id.videoId;
    console.log(`✅ Found ID: ${videoId}`);
    return videoId;

  } catch (error) {
    console.error("❌ Network/Fetch Error:", error);
    return null;
  }
}

// This function is for "Open in YouTube" buttons, NOT the player.
// It is correct for it to return a search URL.
export function getYouTubeLink(track) {
  const q = `${track.artist} - ${track.name}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

export function getYouTubeEmbedUrl(videoId) {
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
}