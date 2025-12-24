// src/components/Player.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player/youtube';
import { Play, Pause, SkipForward, Volume2, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { fetchVideoId } from '../services/youtube';

export function Player({ track, onClose }) {
  const [playing, setPlaying] = useState(false);
  const [youtubeId, setYoutubeId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState(null);
  const [played, setPlayed] = useState(0); // 0 to 1
  const playerRef = useRef(null);

  // --- 1. HANDLE TRACK CHANGES ---
  useEffect(() => {
    let active = true;

    if (track) {
      // Reset State
      setPlaying(false);
      setIsReady(false);
      setYoutubeId(null);
      setError(null);
      setPlayed(0);
      setLoadingAudio(true);

      // Fetch Video ID
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
    // Error 150/101 = Restricted Embed. 
    // We catch generic errors too just in case.
    setError("Restricted");
    setPlaying(false);
  };

  const togglePlay = () => {
    if (!isReady || error) return;
    setPlaying(!playing);
  };

  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-10">
      <div className="max-w-2xl mx-auto bg-gray-950/90 border border-gray-800 backdrop-blur-md shadow-2xl p-4 flex gap-4 items-center rounded-sm relative overflow-hidden">
        
        {/* Progress Bar (Top Border) */}
        <div className="absolute top-0 left-0 h-0.5 bg-gray-800 w-full">
          <div 
            className="h-full bg-accent transition-all duration-300 ease-linear"
            style={{ width: `${played * 100}%` }}
          />
        </div>

        {/* --- 3. VIDEO MONITOR (THE FIX) --- */}
        {/* CRITICAL FIX: We do NOT use 'hidden'. 
           We use w-0 h-0 on mobile to keep the instance alive.
        */}
        <div className="relative shrink-0 overflow-hidden group 
          w-0 h-0 opacity-0 
          sm:w-32 sm:h-24 sm:opacity-100 sm:border sm:border-gray-800 sm:bg-gray-900 transition-all"
        >
          {youtubeId && !error && (
            <ReactPlayer
              ref={playerRef}
              url={`https://www.youtube.com/watch?v=${youtubeId}`}
              width="100%"
              height="100%"
              playing={playing}
              controls={false}
              volume={0.8}
              onReady={handleReady}
              onProgress={({ played }) => setPlayed(played)}
              onError={handleError} // <--- Error Handler
              onEnded={() => setPlaying(false)}
              config={{
                youtube: {
                  playerVars: { showinfo: 0, modestbranding: 1 }
                }
              }}
            />
          )}

          {/* Visual State: Loading */}
          {loadingAudio && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
          )}

          {/* Visual State: Error (Static Noise) */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-red-500 z-10 p-2 text-center">
              <AlertCircle className="w-6 h-6 mb-1 opacity-50" />
              <span className="text-[8px] font-mono uppercase tracking-widest">Signal Lost</span>
            </div>
          )}
        </div>

        {/* --- 4. CONTROLS & INFO --- */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          {/* Metadata */}
          <div className="flex justify-between items-start">
            <div className="truncate pr-4">
              <h3 className={`text-sm font-bold truncate ${error ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
                {track.name}
              </h3>
              <p className="text-xs text-gray-500 uppercase tracking-wider truncate">
                {track.artist}
              </p>
            </div>

            {/* ERROR / LINK BUTTON */}
            {/* Shows automatically on error, or if user wants to open manually */}
            {(error || youtubeId) && (
              <a 
                href={youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : `https://www.youtube.com/results?search_query=${track.artist}+${track.name}`}
                target="_blank"
                rel="noreferrer"
                className={`
                  flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-widest border transition-all
                  ${error 
                    ? 'border-red-900/50 bg-red-900/10 text-red-400 hover:bg-red-900/20' 
                    : 'border-gray-800 text-gray-500 hover:text-accent hover:border-accent'}
                `}
              >
                {error ? 'Play External' : 'Open YT'}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Control Bar */}
          <div className="flex items-center gap-4 mt-1">
            <button 
              onClick={togglePlay}
              disabled={!isReady || !!error}
              className={`
                w-8 h-8 flex items-center justify-center border transition-all
                ${error 
                  ? 'border-red-900/30 text-red-900 cursor-not-allowed' 
                  : isReady 
                    ? 'border-accent text-black bg-accent hover:scale-105' 
                    : 'border-gray-700 text-gray-600 animate-pulse cursor-wait'}
              `}
            >
              {loadingAudio ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : error ? (
                <div className="w-2 h-2 bg-red-900 rounded-full" /> 
              ) : playing ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Status Text */}
            <div className="flex-1 font-mono text-[10px] uppercase tracking-widest text-gray-500">
              {loadingAudio ? 'Searching Frequencies...' : 
               error ? <span className="text-red-500">Playback Restricted</span> :
               playing ? 'Now Playing' : 'Paused'}
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="text-gray-600 hover:text-red-400 transition-colors p-2"
            >
              <span className="text-xs font-bold">✕</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}