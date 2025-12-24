import React from 'react';
import { Music2 } from 'lucide-react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-purple-500 selection:text-white">
      <header className="p-6 border-b border-neutral-800 flex items-center gap-3">
        <Music2 className="w-8 h-8 text-purple-500" />
        <h1 className="text-xl font-bold tracking-tighter">REKKOMA</h1>
      </header>
      
      <main className="max-w-4xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}