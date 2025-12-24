// src/services/youtube.js

// IF we are in production (on Vercel), use the relative path (empty string).
// IF we are local (npm run dev), look for Python on port 8000.
const API_BASE = import.meta.env.PROD ? "" : "http://127.0.0.1:8000";

export async function fetchVideoId(track) {
  const query = `${track.artist} ${track.name}`;
  console.log(`[Youtube Service] Searching: ${query}`);

  try {
    // We now point to "/api/search".
    // On Vercel, this routes to api/index.py automatically.
    // Locally, it hits http://127.0.0.1:8000/api/search (if you updated main.py)
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    
    if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
    }

    const data = await res.json();
    
    if (data.videoId) {
      console.log(`[Youtube Service] ID Found: ${data.videoId}`);
      return data.videoId;
    }
  } catch (err) {
    console.error("YouTube Fetch Error:", err);
    // Return null so the UI handles the error gracefully
    return null; 
  }
  return null;
}