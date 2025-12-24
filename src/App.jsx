import React from 'react';
import Layout from './components/Layout';
import SearchInput from './components/SearchInput';
import GameLoop from './components/GameLoop';
import ResultGrid from './components/ResultGrid';
import { useRekkoma } from './hooks/useRekkoma';

// Notice "export default" here - this fixes your error
export default function App() {
  const { stage, pool, question, error, isExpanding, actions } = useRekkoma();

  return (
    <Layout>
      {/* Error Toast */}
      {error && (
        <div className="bg-red-900/20 border border-red-900 text-red-200 p-4 rounded-lg mb-6 text-center animate-in fade-in">
          <p className="font-bold">Error</p>
          <p className="text-sm opacity-80 mb-2">{error}</p>
          <button 
            onClick={actions.reset}
            className="underline hover:text-white text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stage 1: Search Input */}
      {stage === 'input' && (
        <SearchInput onSearch={actions.startGame} isLoading={false} />
      )}

      {/* Stage 2: Nuclear Loading Screen */}
      {stage === 'loading' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in duration-700">
          <div className="relative">
            {/* Background Ring */}
            <div className="w-20 h-20 border-4 border-neutral-800 rounded-full"></div>
            {/* Spinning Ring */}
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white tracking-tight">Building Database</h2>
            <div className="text-neutral-500 font-mono text-sm space-y-1">
              <p className="animate-pulse">Scraping global playlists...</p>
              <p className="text-xs text-neutral-600">(This may take 15-30s for deep results)</p>
            </div>
          </div>
        </div>
      )}

      {/* Stage 3: The Game */}
      {stage === 'game' && (
        <GameLoop 
          question={question} 
          remainingCount={pool.length}
          onAnswer={actions.answerQuestion} 
          isExpanding={isExpanding} // Pass it here
        />
      )}

      {/* Stage 4: Results */}
      {stage === 'results' && (
        <ResultGrid tracks={pool.slice(0, 50)} onReset={actions.reset} />
      )}
    </Layout>
  );
}