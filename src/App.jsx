// src/App.jsx
import { useState, useEffect } from 'react';
import { useRekkoma } from './hooks/useRekkoma';

// Components
import { Layout } from './components/Layout';
import { GameLoop } from './components/GameLoop';
import { SearchInput } from './components/SearchInput';
import { Player } from './components/Player';

function App() {
  const { stage, pool, question, error, isExpanding, actions } = useRekkoma();
  
  // Local state for the audio player
  const [currentTrack, setCurrentTrack] = useState(null);

  // Scroll to top when stage changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  return (
    <Layout>
      {/* ERROR HANDLING */}
      {error && (
        <div className="mb-8 p-4 border border-red-900/50 bg-red-900/10 text-red-200 text-xs font-mono uppercase tracking-widest animate-pulse">
          [CRITICAL ERROR]: {error}
        </div>
      )}

      {/* STAGE: INPUT */}
      {stage === 'input' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 animate-in fade-in duration-700">
          <div className="space-y-4 text-center max-w-lg">
            <div className="w-16 h-16 bg-gray-900 border border-gray-800 mx-auto flex items-center justify-center mb-6 relative group">
              <div className="absolute inset-0 bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-8 h-8 bg-accent animate-pulse relative z-10"></div>
            </div>
            <p className="text-gray-500 text-xs uppercase tracking-[0.2em]">
              System Ready. Waiting for Input.
            </p>
          </div>
          <SearchInput onSearch={actions.startGame} isLoading={stage === 'loading'} />
        </div>
      )}

      {/* STAGE: LOADING */}
      {stage === 'loading' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="w-64 h-1 bg-gray-900 overflow-hidden relative">
            <div 
              className="absolute inset-y-0 left-0 bg-accent w-1/3 animate-[scanline_2s_linear_infinite]" 
              style={{ animationDirection: 'alternate' }}
            />
          </div>
          <div className="text-accent text-xs font-mono uppercase tracking-widest animate-pulse">
            Constructing Search Index...
          </div>
        </div>
      )}

      {/* STAGE: GAME */}
      {stage === 'game' && (
        <div className="max-w-xl mx-auto">
          {isExpanding && (
            <div className="fixed top-20 right-4 md:right-8 flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 text-accent text-[10px] uppercase tracking-widest z-50 animate-in fade-in">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></span>
              Expanded Pool
            </div>
          )}
          
          <GameLoop 
            pool={pool} 
            question={question} 
            onAnswer={actions.answerQuestion}
            history={pool.filter(t => t.score !== 0)} 
          />
          
          <div className="text-center mt-16">
            <button 
              onClick={actions.reset}
              className="text-[10px] text-gray-700 hover:text-red-500 uppercase tracking-widest transition-colors border-b border-transparent hover:border-red-500 pb-1"
            >
              [ Terminate Session ]
            </button>
          </div>
        </div>
      )}

      {/* STAGE: RESULTS */}
      {stage === 'results' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 pb-24">
          <div className="border-l-2 border-accent pl-4 py-2 flex justify-between items-end">
            <div>
              <h2 className="text-xl text-gray-100 font-light">Analysis Complete</h2>
              <p className="text-xs text-accent uppercase tracking-widest mt-1">
                Optimal Candidates Identified
              </p>
            </div>
            <div className="text-[10px] text-gray-600 font-mono">
              TOTAL_RECS: {pool.length}
            </div>
          </div>

          <div className="space-y-4">
            {pool.slice(0, 10).map((track, i) => (
              <div 
                key={track.id}
                className={`
                  relative group p-4 border bg-gray-900/40 
                  transition-all duration-300
                  ${i === 0 
                    ? 'border-accent/50 bg-gray-900/80 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                    : 'border-gray-800 opacity-80 hover:opacity-100 hover:border-gray-600'}
                `}
              >
                {/* Match Badge for Top Result */}
                {i === 0 && (
                   <div className="absolute -top-2 -right-2 bg-accent text-black text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                     Match 99.9%
                   </div>
                )}
                
                <div className="flex justify-between items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 font-mono w-4">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-sm font-medium text-gray-200 truncate group-hover:text-accent transition-colors">
                        {track.name}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide pl-6 truncate">
                      {track.artist}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Internal Player Button */}
                    <button
                      onClick={() => setCurrentTrack(track)}
                      className={`
                        px-3 py-1.5 border text-[10px] uppercase tracking-widest transition-all
                        ${currentTrack?.id === track.id 
                          ? 'bg-accent text-black border-accent font-bold' 
                          : 'border-gray-700 text-gray-400 hover:border-accent hover:text-accent'}
                      `}
                    >
                      {currentTrack?.id === track.id ? 'PLAYING' : 'PLAY'}
                    </button>

                    {/* Spotify Link (Optional External) */}
                    <a 
                      href={`https://open.spotify.com/track/${track.id}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1.5 text-gray-600 hover:text-green-500 transition-colors"
                      title="Open in Spotify"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.5.4-.8.2-2.2-1.3-5-1.6-8.3-.9-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 3.6-.8 6.7-.5 9.2 1 .3.1.4.5.2.8zm1.1-2.9c-.3.4-.8.5-1.2.3-2.7-1.7-6.8-2.2-9.9-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.6-1.1 8.1-.6 11.2 1.3.4.1.5.6.3 1.1zm.1-2.9c-3.2-1.9-8.5-2.1-11.6-1.1-.5.2-1-.1-1.2-.6-.2-.5.1-1 .6-1.2 3.6-1.1 9.4-.8 13.2 1.4.4.3.5.8.3 1.3-.3.4-.8.5-1.3.2z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-8">
            <button 
              onClick={actions.reset}
              className="px-8 py-3 bg-gray-100 text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-accent hover:scale-105 transition-all duration-300"
            >
              Initialize New Search
            </button>
          </div>
        </div>
      )}

      {/* AUDIO PLAYER OVERLAY */}
      {/* Persists across renders but only shows when track is selected */}
      <Player 
        track={currentTrack} 
        onClose={() => setCurrentTrack(null)} 
      />

    </Layout>
  );
}

export default App;