import React from 'react';
import { useRekkoma } from '../hooks/useRekkoma'; // Ensure context usage if needed, or pass prop

export default function GameLoop({ question, remainingCount, onAnswer, isExpanding }) { // Add isExpanding prop
  
  if (!question && !isExpanding) return null;

  // NEW: "Thinking" State
  if (isExpanding) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] animate-in fade-in">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-white">Digging deeper...</h2>
        <p className="text-neutral-400">Finding more tracks like that.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto min-h-[50vh] animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Progress Pill */}
      <div className="mb-8 px-4 py-1 bg-neutral-800 rounded-full text-xs font-mono text-neutral-400 border border-neutral-700">
        {remainingCount} candidates remaining
      </div>

      {/* Question Card */}
      <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12 leading-tight">
        {/* Render Markdown-like bolding */}
        {question.text.split('**').map((part, i) => 
          i % 2 === 1 ? <span key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{part}</span> : part
        )}
      </h2>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={() => onAnswer(true)}
          className="group relative h-32 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-purple-500 hover:bg-neutral-800 transition-all duration-300"
        >
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white group-hover:scale-110 transition-transform">
            {question.yesLabel || "Yes"} 
          </span>
        </button>

        <button
          onClick={() => onAnswer(false)}
          className="group relative h-32 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-red-500 hover:bg-neutral-800 transition-all duration-300"
        >
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white group-hover:scale-110 transition-transform">
            {question.noLabel || "No"}
          </span>
        </button>
      </div>

    </div>
  );
}