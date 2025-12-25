import React from 'react';

export function Layout({ children, background }) {
  return (
    // CHANGE: min-h-screen -> h-[100dvh] to lock to mobile viewport
    <div className="h-[100dvh] flex flex-col relative bg-gray-950 text-gray-300 font-mono overflow-hidden transition-colors duration-1000">
      
      {/* --- DYNAMIC AMBIENCE --- */}
      {background && (
        <div className="fixed inset-0 z-0 animate-in fade-in duration-1000">
          <img 
            src={background} 
            className="w-full h-full object-cover blur-[80px] opacity-60 scale-125 transform" 
            alt="" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
          <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 p-6 z-40">
        <h1 className="text-xl font-bold tracking-tighter text-gray-100 drop-shadow-md">
          REKKOMA <span className="text-accent text-[10px] tracking-widest font-normal">SYS.v2</span>
        </h1>
      </header>

      {/* Main Content: overflow-y-auto ensures internal scrolling if needed, but app stays fixed */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 z-20 pt-24 relative overflow-y-auto no-scrollbar">
        {children}
      </main>
    </div>
  );
}