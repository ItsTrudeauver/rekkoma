// src/components/Player.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { fetchVideoId } from '../services/youtube'; // <--- The Missing Link

export function Player({ track, onClose }) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [played, setPlayed] = useState(0); 
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  // NEW: State for the real YouTube ID
  const [youtubeId, setYoutubeId] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  
  const playerRef = useRef(null);

  // 1. When track changes, search for the YouTube ID
  useEffect(() => {
    let active = true; // Prevent race conditions

    if (track) {
      // Reset State
      setPlaying(false);
      setPlayed(0);
      setIsReady(false);
      setYoutubeId(null);
      setLoadingAudio(true);

      // Perform Search
      fetchVideoId(track).then(id => {
        if (!active) return;
        
        if (id) {
          setYoutubeId(id);
          setPlaying(true); // Auto-play once found
        } else {
          console.warn("Audio stream not found for:", track.name);
        }
        setLoadingAudio(false);
      });
    }

    return () => { active = false; };
  }, [track]);

  if (!track) return null;

  const handleSeek = (e) => {
    const newPlayed = parseFloat(e.target.value);
    setPlayed(newPlayed);
    playerRef.current?.seekTo(newPlayed);
  };

  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const date = new Date(seconds * 1000);
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-800 bg-black z-50 animate-in slide-in-from-bottom duration-500">
      
      {/* HIDDEN ENGINE */}
      <div className="hidden">
        {youtubeId && (
          <ReactPlayer
            ref={playerRef}
            url={`https://www.youtube.com/watch?v=${youtubeId}`} 
            playing={playing}
            volume={volume}
            width="0"
            height="0"
            onReady={() => {
              setIsReady(true);
              if (playerRef.current) {
                 setDuration(playerRef.current.getDuration());
              }
            }}
            onProgress={({ played }) => setPlayed(played)}
            onEnded={() => setPlaying(false)}
            onError={(e) => console.log("Stream Error:", e)}
          />
        )}
      </div>

      {/* INDUSTRIAL CONTROLS */}
      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-2">
        
        {/* Track Info & Status */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
             {/* Status Light */}
             <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
               loadingAudio ? 'bg-accent animate-ping' : 
               isReady ? 'bg-green-500' : 'bg-red-900'
             }`} />
             
             <div className="flex flex-col">
               <span className="text-xs text-gray-100 font-bold uppercase tracking-widest truncate max-w-[200px]">
                 {track.name}
               </span>
               <span className="text-[10px] text-gray-500 uppercase tracking-widest flex gap-2">
                 {track.artist}
                 {loadingAudio && <span className="text-accent animate-pulse">:: SEEKING FREQUENCY...</span>}
               </span>
             </div>
          </div>
          
          <button 
            onClick={onClose}
            className="text-[10px] text-gray-600 hover:text-red-500 uppercase tracking-widest"
          >
            [EJECT]
          </button>
        </div>

        {/* Slider */}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[10px] font-mono text-gray-500 w-8 text-right">
            {formatTime(duration * played)}
          </span>
          
          <input
            type="range"
            min={0}
            max={0.999999}
            step="any"
            value={played}
            onChange={handleSeek}
            disabled={!isReady}
            className="
              flex-1 h-1 bg-gray-800 appearance-none cursor-pointer disabled:opacity-50
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 
              [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-none
            "
          />

          <span className="text-[10px] font-mono text-gray-500 w-8">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-8 items-center pt-2">
           <button 
             onClick={() => isReady && setPlaying(!playing)}
             disabled={!isReady}
             className={`
               font-mono text-xl transition-colors
               ${isReady ? 'text-accent hover:text-accent-glow' : 'text-gray-800 cursor-wait'}
             `}
           >
             {playing ? 'II' : '►'}
           </button>
        </div>

      </div>
    </div>
  );
}