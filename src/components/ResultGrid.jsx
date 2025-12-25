import React from 'react';
import { getYouTubeLink } from '../services/youtube'; 
import { RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { SystemAudio } from '../services/sound';

export default function ResultGrid({ tracks, onReset }) {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-in fade-in">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No tracks found</h2>
        <button 
          onClick={() => {
            SystemAudio.click();
            onReset();
          }} 
          onMouseEnter={() => SystemAudio.hover()}
          className="px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
        >
          Try Again
        </button>
      </div>
    );
  }

  const track = tracks[0];

  return (
    <div className="flex flex-col items-center animate-in fade-in duration-1000 max-w-xl mx-auto w-full">
      
      <div className="w-full flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">The Chosen Track</h2>
        <button 
          onClick={() => {
            SystemAudio.click();
            onReset();
          }} 
          onMouseEnter={() => SystemAudio.hover()}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Start Over
        </button>
      </div>

      {/* --- OFFICIAL SPOTIFY EMBED --- */}
      <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="w-full h-[352px] bg-black">
           <iframe 
             style={{ borderRadius: '12px' }} 
             src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`} 
             width="100%" 
             height="352" 
             frameBorder="0" 
             allowFullScreen="" 
             allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
             loading="lazy"
             title="Spotify Player"
           />
        </div>

        <div className="p-6 border-t border-neutral-800">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
               <p className="text-neutral-400 text-sm font-mono mb-2">
                 Result found via {(track.genres && track.genres[0]) || 'algorithm'}
               </p>
               <div className="flex gap-2">
                 <a 
                   href={`https://open.spotify.com/track/${track.id}`}
                   target="_blank" 
                   rel="noopener noreferrer"
                   onClick={() => SystemAudio.click()}
                   onMouseEnter={() => SystemAudio.hover()}
                   className="text-xs bg-[#1DB954] text-black font-bold px-3 py-1 rounded-full hover:scale-105 transition-transform"
                 >
                   Open Spotify
                 </a>
                 <a 
                   href={getYouTubeLink(track)} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   onClick={() => SystemAudio.click()}
                   onMouseEnter={() => SystemAudio.hover()}
                   className="text-xs bg-red-600 text-white font-bold px-3 py-1 rounded-full hover:bg-red-700 transition-colors"
                 >
                   Search YouTube
                 </a>
               </div>
            </div>
            
            <div className="w-16 h-16 rounded-md overflow-hidden opacity-50 grayscale">
               {track.image ? (
                 <img src={track.image} alt="Art" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-neutral-800" />
               )}
            </div>
          </div>
        </div>
      </div>
      
      <p className="mt-4 text-xs text-neutral-600">
        Note: Free users hear 30s preview. Premium hears full track.
      </p>
    </div>
  );
}