import React, { useState } from 'react';
import { SystemAudio } from '../services/sound';

export function SearchInput({ onSearch, isLoading }) {
  const [query, setQuery] = useState('');
  const [popRange, setPopRange] = useState({ min: 0, max: 100 });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      SystemAudio.click(); // Confirm sound
      // Pass query AND popularity range to the parent
      onSearch(query, popRange);
    }
  };

  const handleTyping = (e) => {
    setQuery(e.target.value);
    SystemAudio.type(); // Mechanical tick
  };

  return (
    <div className="w-full mt-20 space-y-4">
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500">
        <label>Initialize Seed Parameter</label>
        {isLoading && <span className="text-accent animate-pulse">Running...</span>}
      </div>
      
      <form onSubmit={handleSubmit} className="relative space-y-4">
        {/* TEXT INPUT */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-accent text-lg font-mono">›</span>
          </div>
          
          <input
            type="text"
            value={query}
            onChange={handleTyping}
            disabled={isLoading}
            className="
              block w-full pl-10 pr-4 py-4
              bg-gray-950 border border-gray-800 
              text-gray-100 font-mono text-sm
              focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-gray-700 placeholder:uppercase
              transition-all duration-300
            "
            placeholder="Enter Artist / Genre / Tag..."
            autoFocus
          />
          
          {/* Loading Bar */}
          {isLoading && (
            <div className="absolute bottom-0 left-0 h-[2px] bg-accent animate-scanline w-full" />
          )}
        </div>

        {/* POPULARITY CONTROLS */}
        <div className="p-4 border border-gray-800 bg-gray-900/50 rounded space-y-3">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400 font-mono">
                <span>Popularity Scope</span>
                <span className="text-accent">{popRange.min}% — {popRange.max}%</span>
            </div>

            <div className="space-y-3 pt-2">
                 {/* Min Slider */}
                 <div className="flex items-center gap-3">
                    <span className="text-[9px] text-gray-600 font-mono w-6">MIN</span>
                    <input 
                        type="range" min="0" max="100" 
                        value={popRange.min}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setPopRange(prev => ({ ...prev, min: Math.min(val, prev.max) }));
                            SystemAudio.type(); // Zipper effect
                        }}
                        className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                 </div>
                 {/* Max Slider */}
                 <div className="flex items-center gap-3">
                    <span className="text-[9px] text-gray-600 font-mono w-6">MAX</span>
                    <input 
                        type="range" min="0" max="100" 
                        value={popRange.max}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setPopRange(prev => ({ ...prev, max: Math.max(val, prev.min) }));
                            SystemAudio.type(); // Zipper effect
                        }}
                        className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                 </div>
            </div>
            
            <p className="text-[9px] text-gray-600 font-mono text-center pt-1">
                {popRange.max < 30 ? "Target: Hidden Gems" : 
                 popRange.min > 70 ? "Target: Top Hits" : 
                 "Target: All Popularity Levels"}
            </p>
        </div>
      </form>

      <div className="text-[10px] text-gray-700 font-mono">
        Examples: "Dark Techno", "Shoegaze", "Sad 80s"
      </div>
    </div>
  );
}