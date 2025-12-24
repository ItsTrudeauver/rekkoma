import { useState, useEffect } from 'react';
import { useRekkoma } from './hooks/useRekkoma';

import { Layout } from './components/Layout';
import { GameLoop } from './components/GameLoop';
import { SearchInput } from './components/SearchInput';
import { Player } from './components/Player';

function App() {
  const { stage, pool, question, error, actions } = useRekkoma();
  const [currentTrack, setCurrentTrack] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  return (
    <Layout background={currentTrack?.image}>
      
      {/* LAYOUT SHIFT CONTAINER 
         - We use 'lg:mr-[420px]' to leave space for the floating player widget + padding.
         - The container itself is transparent; the widgets inside provide the structure.
      */}
      <div className={`
          relative transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${currentTrack ? 'lg:mr-[420px]' : 'mr-0'}
      `}>
        
        {/* Error Banner */}
        {error && (
          <div className="mb-8 p-4 rounded-lg border border-red-500/30 bg-red-900/20 text-red-200 text-xs font-mono uppercase tracking-widest backdrop-blur-md">
            [CRITICAL ERROR]: {error}
          </div>
        )}

        {/* --- STAGE: INPUT --- */}
        {stage === 'input' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 animate-in fade-in duration-700">
             <div className="space-y-4 text-center max-w-lg">
                <div className="w-16 h-16 bg-gray-900/50 border border-gray-800 mx-auto flex items-center justify-center mb-6 rounded-full relative group">
                  <div className="absolute inset-0 bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-4 h-4 bg-accent rounded-full animate-pulse relative z-10"></div>
                </div>
                <p className="text-gray-500 text-xs uppercase tracking-[0.2em]">System Ready</p>
             </div>
             <SearchInput onSearch={actions.startGame} isLoading={stage === 'loading'} />
          </div>
        )}

        {/* --- STAGE: LOADING --- */}
        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
             <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
             <div className="text-accent text-xs font-mono uppercase tracking-widest animate-pulse">
               Constructing Index...
             </div>
          </div>
        )}

        {/* --- STAGE: GAME --- */}
        {stage === 'game' && (
          <div className="max-w-2xl mx-auto py-8">
            <GameLoop 
              pool={pool} 
              question={question} 
              onAnswer={actions.answerQuestion}
              history={pool.filter(t => t.score !== 0)} 
            />
            <div className="text-center mt-12">
               <button onClick={actions.reset} className="text-[10px] text-gray-500 hover:text-red-400 uppercase tracking-widest transition-colors">
                  Terminate Session
               </button>
            </div>
          </div>
        )}

        {/* --- STAGE: RESULTS (THE CANDIDATE WIDGET) --- */}
        {stage === 'results' && (
          <div className="max-w-4xl mx-auto pb-24 animate-in slide-in-from-bottom-4 duration-700">
            
            {/* The Candidate List Widget (Glass Card) */}
            <div className="bg-gray-950/60 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl overflow-hidden">
              
              <div className="flex justify-between items-end mb-6 border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-xl text-gray-100 font-light">Analysis Complete</h2>
                  <p className="text-xs text-accent uppercase tracking-widest mt-1">
                    {pool.length} Candidates Identified
                  </p>
                </div>
                <button onClick={actions.reset} className="px-4 py-2 bg-gray-100 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-accent rounded transition-colors">
                  Restart
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {pool.slice(0, 10).map((track, i) => (
                  <div 
                    key={track.id}
                    onClick={() => setCurrentTrack(track)}
                    className={`
                      group flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 border
                      ${currentTrack?.id === track.id 
                        ? 'bg-accent/10 border-accent/50 translate-x-1' 
                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'}
                    `}
                  >
                    <span className="text-[10px] text-gray-500 font-mono w-6 text-right">{String(i + 1).padStart(2, '0')}</span>
                    
                    <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-900 shadow-sm">
                      {track.image && (
                         <img src={track.image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium truncate transition-colors ${currentTrack?.id === track.id ? 'text-accent' : 'text-gray-200 group-hover:text-white'}`}>
                        {track.name}
                      </h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wide truncate">{track.artist}</p>
                    </div>

                    {currentTrack?.id === track.id && (
                       <div className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_currentColor]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 3. FLOATING PLAYER WIDGET
          - Fixed position
          - Margin on all sides (top-4, right-4, bottom-4)
          - Rounded corners
          - Slides off-screen to the right when not active
      */}
      <div className={`
        fixed top-4 right-4 bottom-4 w-[380px] z-50 
        bg-gray-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden
        transform transition-transform duration-500 cubic-bezier(0.3, 1, 0.4, 1)
        ${currentTrack ? 'translate-x-0' : 'translate-x-[110%]'}
      `}>
        {/* We pass the 'onClose' to hide the widget */}
        <Player 
          track={currentTrack} 
          onClose={() => setCurrentTrack(null)} 
        />
      </div>

    </Layout>
  );
}

export default App;