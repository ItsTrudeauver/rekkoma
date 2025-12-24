// src/components/Player.jsx
import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player'; // <--- REVERTED TO STANDARD IMPORT
import { fetchVideoId } from '../services/youtube';

export function Player({ track, onClose }) {
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0); 
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const [youtubeId, setYoutubeId] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  
  const playerRef = useRef(null);

  // 1. Search for ID when track changes
  useEffect(() => {
    let active = true;

    if (track) {
      setPlaying(false);
      setIsReady(false);
      setLoadingAudio(true);
      setYoutubeId(null);
      setPlayed(0);

      fetchVideoId(track).then(id => {
        if (!active) return;
        
        if (id) {
          setYoutubeId(id);
          setPlaying(true); 
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
      
      <div className="max-w-4xl mx-auto p-3 flex gap-4 items-center h-28">
        
        {/* --- VISIBLE MONITOR (REQUIRED) --- */}
        <div className="relative w-32 h-24 shrink-0 border border-gray-800 bg-gray-900 overflow-hidden hidden sm:block group">
           {youtubeId ? (
             <div className="w-full h-full grayscale contrast-125 opacity-80 pointer-events-none transition-opacity duration-300 group-hover:opacity-100">
                <ReactPlayer
                  ref={playerRef}
                  url={`https://www.youtube.com/watch?v=${youtubeId}`} 
                  playing={playing}
                  volume={0.8}
                  width="100%"
                  height="100%"
                  controls={false}
                  onReady={() => {
                    setIsReady(true);
                    setDuration(playerRef.current?.getDuration() || 0);
                  }}
                  onProgress={({ played }) => setPlayed(played)}
                  onEnded={() => setPlaying(false)}
                  onError={(e) => console.log("Stream Error:", e)}
                  config={{
                    youtube: {
                      playerVars: { 
                        showinfo: 0, 
                        controls: 0, 
                        modestbranding: 1, 
                        iv_load_policy: 3,
                        fs: 0
                      }
                    }
                  }}
                />
             </div>
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 gap-2">
                <div className="w-6 h-6 border-2 border-gray-700 border-t-accent animate-spin rounded-full" />
                <span className="text-[9px] text-gray-500 font-mono animate-pulse">SEARCHING</span>
             </div>
           )}
           
           <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none" />
        </div>

        {/* --- CONTROLS --- */}
        <div className="flex-1 flex flex-col justify-between h-full py-1">
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                 <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-900 animate-pulse'}`} />
                 
                 <div className="flex flex-col">
                   <span className="text-xs text-gray-100 font-bold uppercase tracking-widest truncate max-w-[180px] md:max-w-[300px]">
                     {track.name}
                   </span>
                   <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-2">
                     {track.artist}
                     {loadingAudio && <span className="text-accent animate-pulse">:: ESTABLISHING UPLINK...</span>}
                   </span>
                 </div>
              </div>
              
              <button 
                onClick={onClose}
                className="text-[10px] text-gray-600 hover:text-red-500 uppercase tracking-widest px-2 transition-colors"
              >
                [EJECT]
              </button>
            </div>

            <div className="flex items-center gap-3 w-full">
              <span className="text-[10px] font-mono text-gray-500 w-9 text-right">
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
                  hover:[&::-webkit-slider-thumb]:bg-white transition-all
                "
              />

              <span className="text-[10px] font-mono text-gray-500 w-9">
                {formatTime(duration)}
              </span>
            </div>

            <div className="flex justify-center items-center">
               <button 
                 onClick={() => isReady && setPlaying(!playing)}
                 disabled={!isReady}
                 className={`
                   font-mono text-2xl transition-all duration-200
                   ${isReady ? 'text-accent hover:text-white hover:scale-110' : 'text-gray-800 cursor-wait'}
                 `}
               >
                 {playing ? 'II' : '►'}
               </button>
            </div>
        </div>

      </div>
    </div>
  );
}