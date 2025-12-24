import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

export default function SearchInput({ onSearch, isLoading }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) onSearch(input);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in duration-700">
      <div className="space-y-2">
        <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white">
          Find your next<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            obsession.
          </span>
        </h2>
        <p className="text-neutral-400 text-lg">
          Describe what you want (e.g., "Japanese Jazz", "Gym Phonk", "Sad Indie").
          <br />We'll build a custom recommendation engine just for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-lg relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What are you in the mood for?"
          className="w-full bg-neutral-900 border border-neutral-700 rounded-full px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-neutral-600"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-2 top-2 bottom-2 bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-full transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}