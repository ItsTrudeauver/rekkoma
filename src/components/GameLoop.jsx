import React, { useState } from 'react';

// Internal Toggle Component (No external files needed)
const IndustrialToggle = ({ onToggle, leftLabel, rightLabel }) => {
  const [active, setActive] = useState(null); // null = center/neutral

  const handleClick = (val) => {
    setActive(val);
    // Add small delay for visual feedback before submitting
    setTimeout(() => {
      onToggle(val);
      setActive(null);
    }, 250);
  };

  return (
    <div className="flex items-center justify-between w-full border border-gray-800 bg-gray-900/30 p-1">
      {/* Left Option (False) */}
      <button
        onClick={() => handleClick(false)}
        className={`
          flex-1 py-3 px-4 text-xs uppercase tracking-widest transition-all duration-200 border border-transparent
          ${active === false 
            ? 'bg-gray-800 text-white border-gray-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]' 
            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}
        `}
      >
        {leftLabel || "NEGATIVE"}
      </button>

      {/* The Switch Indicator */}
      <div className="w-px h-8 bg-gray-800 mx-1"></div>

      {/* Right Option (True) */}
      <button
        onClick={() => handleClick(true)}
        className={`
          flex-1 py-3 px-4 text-xs uppercase tracking-widest transition-all duration-200 border border-transparent
          ${active === true 
            ? 'bg-accent text-black border-accent-dim shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] font-bold' 
            : 'text-gray-500 hover:text-accent hover:bg-gray-900'}
        `}
      >
        {rightLabel || "AFFIRMATIVE"}
      </button>
    </div>
  );
};

export function GameLoop({ pool, question, onAnswer, history }) {
  // Clean markdown manually
  const cleanText = (text) => text ? text.replace(/\*\*/g, '').replace(/\*/g, '') : '';

  if (!question) return (
    <div className="p-8 border border-gray-800 text-accent font-mono text-xs animate-pulse uppercase tracking-widest">
      "Computing next node..."
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. Data Display Panel */}
      <div className="border border-gray-700 bg-black shadow-2xl relative overflow-hidden">
        {/* Decorative corner markers */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-accent"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-accent"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent"></div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
              Query Sequence {String(history.length + 1).padStart(2, '0')}
            </h2>
            <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-light">
              {cleanText(question.text)}
            </p>
          </div>

          <div className="pt-6 border-t border-gray-800">
            <IndustrialToggle 
              onToggle={onAnswer} 
              leftLabel={question.noLabel} 
              rightLabel={question.yesLabel} 
            />
          </div>
        </div>
      </div>

      {/* 2. Pool Telemetry */}
      <div className="space-y-2">
        <div className="flex justify-between items-end border-b border-gray-800 pb-2">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600">
            Active Candidates
          </h3>
          <span className="text-[10px] font-mono text-accent">
            CNT: {pool.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-px bg-gray-900 border border-gray-800">
          {pool.slice(0, 6).map((track, i) => (
            <div key={track.id} className="flex items-center gap-4 p-3 bg-gray-950 hover:bg-gray-900 transition-colors group">
              <span className="text-[10px] text-gray-600 font-mono w-4">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-300 truncate group-hover:text-accent transition-colors">
                  {track.name}
                </div>
                <div className="text-[10px] text-gray-600 truncate uppercase">
                  {track.artist}
                </div>
              </div>
              <div className="text-[10px] font-mono text-gray-700 group-hover:text-gray-500">
                {track.score > 0 ? '+' : ''}{track.score}
              </div>
            </div>
          ))}
        </div>
        {pool.length > 6 && (
            <div className="text-[10px] text-gray-700 text-center pt-2 italic">
              // +{pool.length - 6} hidden records
            </div>
        )}
      </div>
    </div>
  );
}