from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic

app = FastAPI()
yt = YTMusic()

# Allow CORS so localhost:5173 can talk to port 8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔴 CRITICAL FIX: Changed from "/search" to "/api/search"
# This matches the request path sent by youtube.js
@app.get("/api/search")
def search_track(q: str):
    print(f"Searching: {q}")
    try:
        # 1. Try to find the Song (Official Audio)
        results = yt.search(q, filter="songs")
        
        # 2. Fallback to Video if no song found
        if not results:
            results = yt.search(q, filter="videos")

        # 3. Last resort: General search
        if not results:
            results = yt.search(q)

        if not results:
            raise HTTPException(status_code=404, detail="No track found")

        # Return the Video ID
        return {"videoId": results[0]['videoId']}
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)