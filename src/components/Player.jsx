// src/components/Player.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player/youtube';
import { Play, Pause, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { fetchVideoId } from '../services/youtube';

export function Player({ track, onClose }) {
  const [playing, setPlaying] = useState(false);
  const [youtubeId, setYoutubeId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);

  // --- 1. EFFECT: LOAD TRACK ---
  useEffect(() => {
    let active = true;

    if (track) {
      // Reset State for new track
      setPlaying(false);
      setIsReady(false);
      setYoutubeId(null);
      setError(null);
      setLoadingAudio(true);

      // Fetch YouTube ID
      fetchVideoId(track).then(id => {
        if (!active) return;

        if (id) {
          setYoutubeId(id);
        } else {
          setError("Video not found");
        }
        setLoadingAudio(false);
      });
    }

    return () => { active = false; };
  }, [track]);

  // --- 2. HANDLERS ---
  const handleReady = () => {
    setIsReady(true);
    setPlaying(true); // Auto-play when ready
  };

  const handleError = (e) => {
    console.warn("Player Error:", e);
    setError("Restricted");
    setPlaying(false);
  };

  const togglePlay = () => {
    if (!isReady || error) return;
    setPlaying(!playing);
  };

  // If no track is active, return nothing (though parent usually handles this)
  if (!track) return null;

  return (
    <div className="h-full flex flex-col relative">
      
      {/* --- TOP: ALBUM ART & INVISIBLE PLAYER --- */}
      <div className="relative aspect-square w-full bg-black group overflow-hidden shrink-0">
        
        {/* The Album Art Image */}
        {track.image ? (
            <img 
              src={track.image} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt={track.name} 
            />
        ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-700 font-mono text-xs">
              NO IMAGE
            </div>
        )}

        {/* MOBILE FIX: The Player must exist in the DOM to load.
           We use w-0 h-0 opacity-0 to "hide" it visually without display:none.
        */}
        <div className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none">
          {youtubeId && !error && (
            <ReactPlayer
              ref={playerRef}
              url={`https://www.youtube.com/watch?v=${youtubeId}`}
              playing={playing}
              volume={0.8}
              onReady={handleReady}
              onError={handleError}
              onEnded={() => setPlaying(false)}
              width="100%"
              height="100%"
              config={{
                youtube: {
                  playerVars: { showinfo: 0, modestbranding: 1 }
                }
              }}
            />
          )}
        </div>

        {/* Overlay Controls (Hover or Paused state) */}
        <div className={`
          absolute inset-0 bg-black/30 flex items-center justify-center transition-all duration-300
          ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 backdrop-blur-[2px]'}
        `}>
          <button 
            onClick={togglePlay}
            disabled={!isReady && !error}
            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:scale-105 hover:bg-white/20 transition-all shadow-xl"
          >
            {loadingAudio ? (
              <Loader2 className="animate-spin w-6 h-6 text-gray-300"/>
            ) : error ? (
              <AlertCircle className="w-6 h-6 text-red-500"/>
            ) : playing ? (
              <Pause className="w-6 h-6 fill-current"/>
            ) : (
              <Play className="w-6 h-6 fill-current ml-1"/>
            )}
          </button>
        </div>
      </div>

      {/* --- MIDDLE: INFO & METADATA --- */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-transparent">
        
        {/* Title Block */}
        <div>
          <h2 className="text-2xl font-bold text-white leading-tight mb-2 drop-shadow-sm">
            {track.name}
          </h2>
          <p className="text-sm text-accent font-bold uppercase tracking-widest">
            {track.artist}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-[10px] uppercase tracking-wider text-gray-400 font-mono">
            {/* Release Date */}
            <div className="p-3 bg-white/5 rounded border border-white/5">
                <span className="block text-gray-500 mb-1">Release</span>
                {track.release_date?.substring(0,4) || 'N/A'}
            </div>
            
            {/* BPM Estimate */}
            <div className="p-3 bg-white/5 rounded border border-white/5">
                <span className="block text-gray-500 mb-1">BPM Estimate</span>
                {Math.round(track.energy * 180)}
            </div>
            
            {/* Genres Tag Cloud */}
            <div className="col-span-2 p-3 bg-white/5 rounded border border-white/5">
                <span className="block text-gray-500 mb-2">Genres / Vibe</span>
                <div className="flex flex-wrap gap-1.5">
                    {track.genres && track.genres.slice(0, 6).map(g => (
                        <span key={g} className="px-1.5 py-0.5 bg-black/40 text-gray-300 rounded text-[9px] border border-white/5">
                          {g}
                        </span>
                    ))}
                </div>
            </div>
        </div>

        {/* Error State Banner */}
        {error && (
            <div className="p-4 bg-red-950/30 border border-red-500/30 text-red-200 text-xs text-center rounded-lg backdrop-blur-sm">
                <p className="font-bold mb-1 tracking-widest uppercase">Playback Restricted</p>
                <p className="opacity-70 mb-3">This track cannot be embedded due to owner restrictions.</p>
                <a 
                    href={youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : `https://www.youtube.com/results?search_query=${track.artist}+${track.name}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 rounded transition-colors"
                >
                    <span>Open in YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        )}
      </div>

      {/* --- BOTTOM: CLOSE BUTTON --- */}
      <div className="p-4 border-t border-white/10 mt-auto">
        <button 
          onClick={onClose}
          className="w-full py-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all rounded-lg"
        >
          Close Widget
        </button>
      </div>

    </div>
  );
}