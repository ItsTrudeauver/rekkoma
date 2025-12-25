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
      
      {/* MAIN CONTENT AREA 
          - Mobile: No margins (Centered)
          - Desktop (lg): Left/Right margins for widgets
      */}
      <div className={`
          relative transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${stage === 'game' ? 'lg:ml-[280px]' : 'ml-0'} 
          ${currentTrack ? 'lg:mr-[340px]' : 'mr-0'}
          mb-24 lg:mb-0 /* Add bottom margin on mobile so Player doesn't cover content */
      `}>
        
        {error && (
          <div className="mb-8 p-4 rounded border border-red-500/30 bg-red-900/20 text-red-200 text-xs font-mono uppercase tracking-widest backdrop-blur-md">
            [CRITICAL ERROR]: {error}
          </div>
        )}

        {stage === 'input' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-12 animate-in fade-in duration-700">
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

        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
             <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
             <div className="text-accent text-xs font-mono uppercase tracking-widest animate-pulse">
               Constructing Index...
             </div>
          </div>
        )}

        {stage === 'game' && (
          <div className="max-w-2xl mx-auto py-4 lg:py-8">
            <GameLoop 
              pool={pool} 
              question={question} 
              onAnswer={actions.answerQuestion}
              history={pool.filter(t => t.score !== 0)} 
            />
            <div className="text-center mt-12 pb-12 lg:pb-0">
               <button onClick={actions.reset} className="text-[10px] text-gray-500 hover:text-red-400 uppercase tracking-widest transition-colors">
                  Terminate Session
               </button>
            </div>
          </div>
        )}

        {/* RESULTS GRID */}
        {stage === 'results' && (
          <div className="max-w-4xl mx-auto pb-32 lg:pb-24 animate-in slide-in-from-bottom-4 duration-700">
            <div className="bg-gray-950/60 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-2xl overflow-hidden">
              <div className="flex justify-between items-end mb-6 border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-xl text-gray-100 font-light">Analysis Complete</h2>
                  <p className="text-xs text-accent uppercase tracking-widest mt-1">{pool.length} Candidates Identified</p>
                </div>
                <button onClick={actions.reset} className="px-4 py-2 bg-gray-100 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-accent rounded transition-colors">Restart</button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {pool.slice(0, 10).map((track, i) => (
                  <div 
                    key={track.id}
                    onClick={() => setCurrentTrack(track)}
                    className={`
                      group flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 border
                      ${currentTrack?.id === track.id ? 'bg-accent/10 border-accent/50 translate-x-1' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'}
                    `}
                  >
                    <span className="text-[10px] text-gray-500 font-mono w-6 text-right">{String(i + 1).padStart(2, '0')}</span>
                    <div className="relative w-8 h-8 rounded overflow-hidden bg-gray-900">
                      {track.image && <img src={track.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xs font-bold truncate ${currentTrack?.id === track.id ? 'text-accent' : 'text-gray-300 group-hover:text-white'}`}>{track.name}</h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- FLOATING WIDGET: LIVE CANDIDATES (LEFT) --- */}
      {/* CHANGE: Hidden on Mobile (hidden), Visible on Desktop (lg:block) */}
      <div className={`
        hidden lg:block
        fixed top-24 left-6 w-[260px] z-30 
        transition-all duration-500 ease-out
        ${stage === 'game' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}
      `}>
        <div className="bg-gray-950/80 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Live Pool</span>
             <span className="text-[10px] text-accent font-mono">{pool.length}</span>
          </div>
          <div className="space-y-2">
            {pool.slice(0, 5).map((track, i) => (
               <div key={track.id} className="flex items-center gap-3 group opacity-80 hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-mono text-gray-600 w-3">0{i+1}</span>
                  <div className="flex-1 min-w-0">
                     <div className="h-1 bg-gray-800 rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-gray-500" style={{ width: `${100 - (i * 15)}%` }} />
                     </div>
                     <p className="text-[10px] text-gray-300 truncate leading-none">{track.name}</p>
                     <p className="text-[8px] text-gray-500 truncate leading-none mt-0.5">{track.artist}</p>
                  </div>
               </div>
            ))}
            {pool.length > 5 && (
               <div className="text-[9px] text-center text-gray-600 pt-2 italic">
                  + {pool.length - 5} others hidden
               </div>
            )}
          </div>
        </div>
      </div>

      {/* --- FLOATING WIDGET: PLAYER (ADAPTIVE) --- */}
      {/* MOBILE: Fixed Bottom Sheet (Slide Up from Bottom)
         DESKTOP: Fixed Right Sidebar (Slide In from Right)
      */}
      <div className={`
        fixed z-50 
        bg-gray-950/90 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden
        transition-transform duration-500 cubic-bezier(0.3, 1, 0.4, 1)

        /* Mobile Styles */
        bottom-0 left-0 right-0 w-full h-[280px] rounded-t-2xl border-b-0
        ${currentTrack ? 'translate-y-0' : 'translate-y-[120%]'}

        /* Desktop Styles (Overwrites Mobile) */
        lg:top-4 lg:right-4 lg:bottom-4 lg:left-auto lg:h-auto lg:w-[320px] lg:rounded-2xl lg:border-b
        ${currentTrack ? 'lg:translate-x-0 lg:translate-y-0' : 'lg:translate-x-[120%] lg:translate-y-0'}
      `}>
        <Player track={currentTrack} onClose={() => setCurrentTrack(null)} />
      </div>

    </Layout>
  );
}

export default App;