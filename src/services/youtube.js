const PYTHON_SERVER = 'http://localhost:8000';

export async function fetchVideoId(track) {
  const query = `${track.artist} ${track.name}`;
  console.log(`[Proxy] Searching: ${query}`);

  try {
    // Call your local Python backend
    const res = await fetch(`${PYTHON_SERVER}/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    if (data.videoId) {
      console.log(`[Proxy] ID Found: ${data.videoId}`);
      return data.videoId;
    }
  } catch (err) {
    console.error("Is the Python server running?", err);
  }
  return null;
}