from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic

app = FastAPI()
yt = YTMusic()

# Allow your React app (localhost:5173) to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/search")
def search_track(q: str):
    print(f"Searching: {q}")
    try:
        # filter='songs' finds the official audio track (High Stability)
        results = yt.search(q, filter="songs")
        
        if not results:
            results = yt.search(q, filter="videos")

        if not results:
            raise HTTPException(status_code=404, detail="No track found")

        # Return the Video ID
        return {"videoId": results[0]['videoId']}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Runs on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)