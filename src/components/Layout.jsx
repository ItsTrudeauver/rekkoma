import React from 'react';

export function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative bg-gray-950 text-gray-300 font-mono">
      {/* Visual Effects */}
      <div className="scanline-overlay" />
      <div className="crt-flicker" />
      
      {/* Header */}
      <header className="border-b border-gray-800 p-4 sticky top-0 bg-gray-950/95 backdrop-blur z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-end">
          <h1 className="text-xl font-bold tracking-tighter leading-none text-gray-100">
            REKKOMA <span className="text-accent text-[10px] align-top tracking-widest font-normal">SYS.v1</span>
          </h1>
          <div className="flex gap-4 text-[10px] uppercase tracking-widest text-gray-600">
            <span className="hidden md:inline">Status: <span className="text-accent">ONLINE</span></span>
            <span>Mem: <span className="text-gray-400">OK</span></span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-8 z-10 relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 p-6 text-center text-[10px] text-gray-600 uppercase tracking-widest">
        <div>Index Construction Complete</div>
        <div className="mt-1 opacity-50">End of Line</div>
      </footer>
    </div>
  );
}