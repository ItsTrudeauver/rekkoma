import React, { useState } from 'react';

export function SearchInput({ onSearch, isLoading }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <div className="w-full mt-20 space-y-4">
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500">
        <label>Initialize Seed Parameter</label>
        {isLoading && <span className="text-accent animate-pulse">Running...</span>}
      </div>
      
      <form onSubmit={handleSubmit} className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-accent text-lg font-mono">›</span>
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
      </form>

      <div className="text-[10px] text-gray-700 font-mono">
        Examples: "Dark Techno", "Shoegaze", "Sad 80s"
      </div>
    </div>
  );
}