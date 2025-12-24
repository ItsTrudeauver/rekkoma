from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic

app = FastAPI()
yt = YTMusic()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔴 CRITICAL FIX: The route MUST start with /api now
@app.get("/api/search")
def search_track(q: str):
    print(f"Searching: {q}")
    try:
        results = yt.search(q, filter="songs")
        if not results:
            results = yt.search(q, filter="videos")
        if not results:
            results = yt.search(q)

        if not results:
            raise HTTPException(status_code=404, detail="No track found")

        return {"videoId": results[0]['videoId']}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# This block is for local dev only
if __name__ == "__main__":
    import uvicorn
    # Vercel ignores this, but locally it runs the server
    uvicorn.run(app, host="0.0.0.0", port=8000)