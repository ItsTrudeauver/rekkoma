import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player/youtube';
import { Play, Pause, AlertCircle, Loader2 } from 'lucide-react';
import { fetchVideoId } from '../services/youtube';

export function Player({ track, onClose }) {
  const [playing, setPlaying] = useState(false);
  const [youtubeId, setYoutubeId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState(null);
  const [played, setPlayed] = useState(0); 
  const playerRef = useRef(null);

  // NEW: State to trigger Spotify fallback
  const [useSpotify, setUseSpotify] = useState(false);

  // --- 1. LOAD TRACK ---
  useEffect(() => {
    let active = true;
    if (track) {
      setPlaying(false);
      setIsReady(false);
      setYoutubeId(null);
      setError(null);
      setPlayed(0);
      setUseSpotify(false); // Reset fallback
      setLoadingAudio(true);

      fetchVideoId(track).then(id => {
        if (!active) return;
        if (id) {
            setYoutubeId(id);
        } else {
            // No YouTube video found? Fallback to Spotify.
            setUseSpotify(true);
        }
        setLoadingAudio(false);
      });
    }
    return () => { active = false; };
  }, [track]);

  // --- 2. HANDLERS ---
  const handleReady = () => {
    setIsReady(true);
    setPlaying(true);
  };

  const handleError = () => {
    // Instead of showing error text, switch to Spotify Embed
    console.log("YouTube Playback Restricted/Error, switching to Spotify.");
    setUseSpotify(true);
  };

  const togglePlay = () => {
    if (!isReady || error) return;
    setPlaying(!playing);
  };

  const handleSeek = (e) => {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedRatio = x / rect.width;
    setPlayed(clickedRatio);
    playerRef.current.seekTo(clickedRatio);
  };

  if (!track) return null;

  return (
    <div className="h-full flex flex-col relative w-full h-full text-xs">
      
      {/* TOP: PLAYER AREA (YouTube OR Spotify) */}
      <div className="relative aspect-video w-full bg-black group overflow-hidden shrink-0 border-b border-white/10">
        
        {useSpotify ? (
          /* SPOTIFY FALLBACK */
          <iframe 
            src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`} 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            allowFullScreen="" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
            className="w-full h-full"
          />
        ) : (
          /* STANDARD YOUTUBE PLAYER */
          <>
            {track.image ? (
                <img src={track.image} className="w-full h-full object-cover opacity-80" alt={track.name} />
            ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-700 font-mono">NO SIGNAL</div>
            )}

            <div className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none">
              {youtubeId && (
                <ReactPlayer
                  ref={playerRef}
                  url={`https://www.youtube.com/watch?v=${youtubeId}`}
                  playing={playing}
                  volume={0.8}
                  onReady={handleReady}
                  onError={handleError}
                  onProgress={({ played }) => setPlayed(played)}
                  onEnded={() => setPlaying(false)}
                  width="100%" height="100%"
                  config={{ youtube: { playerVars: { showinfo: 0, modestbranding: 1, origin: window.location.origin } } }}
                />
              )}
            </div>

            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${playing ? 'opacity-0 group-hover:opacity-100 bg-black/40' : 'opacity-100 bg-black/20'}`}>
              <button 
                onClick={togglePlay}
                disabled={!isReady && !error}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:scale-105 transition-transform"
              >
                {loadingAudio ? <Loader2 className="animate-spin w-4 h-4"/> :
                error ? <AlertCircle className="w-4 h-4 text-red-500"/> :
                playing ? <Pause className="w-4 h-4 fill-current"/> : 
                <Play className="w-4 h-4 fill-current ml-0.5"/>}
              </button>
            </div>
            
            {/* PROGRESS BAR */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer group/seek"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-accent transition-all duration-100 ease-linear relative"
                style={{ width: `${played * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover/seek:opacity-100 shadow" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* INFO AREA (Always Visible) */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-transparent">
        <div>
          <h2 className="text-sm font-bold text-white leading-tight truncate pr-4">{track.name}</h2>
          <p className="text-[10px] text-accent font-bold uppercase tracking-widest truncate">{track.artist}</p>
        </div>

        {/* If using Spotify, we assume no 'error' text is needed, but we keep metadata visible */}
        <div className="grid grid-cols-2 gap-2 text-[9px] uppercase tracking-wider text-gray-400 font-mono">
            <div className="p-2 bg-white/5 rounded border border-white/5">
                <span className="block text-gray-600">Year</span>
                {track.release_date?.substring(0,4) || 'N/A'}
            </div>
            <div className="p-2 bg-white/5 rounded border border-white/5">
                <span className="block text-gray-600">BPM</span>
                {Math.round(track.energy * 180)}
            </div>
            <div className="col-span-2 flex flex-wrap gap-1">
                {track.genres?.slice(0, 4).map((g, i) => (
                    <span key={`${g}-${i}`} className="px-1 py-0.5 bg-black/40 text-gray-300 rounded border border-white/5">{g}</span>
                ))}
            </div>
        </div>
      </div>

      <button onClick={onClose} className="p-3 text-[9px] uppercase tracking-[0.2em] text-gray-500 hover:text-white border-t border-white/10 hover:bg-white/5 transition-colors">
        Close
      </button>
    </div>
  );
}