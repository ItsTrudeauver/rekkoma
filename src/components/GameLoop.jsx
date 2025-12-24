import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const ToggleSwitch = ({ value, onChange }) => {
  return (
    <div 
      onClick={() => onChange(!value)}
      className="flex items-center gap-4 cursor-pointer group select-none"
    >
      {/* NO Label */}
      <span className={`text-xs font-bold tracking-widest transition-colors duration-300 ${!value ? 'text-red-500' : 'text-gray-600 group-hover:text-gray-400'}`}>
        NO
      </span>

      {/* The Switch Track */}
      <div className={`
        relative w-14 h-8 rounded-full border transition-all duration-300 ease-out shadow-inner
        ${value ? 'bg-accent border-accent' : 'bg-gray-800 border-gray-700'}
      `}>
        {/* The Circle/Knob */}
        <div className={`
          absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 cubic-bezier(0.4, 0.0, 0.2, 1)
          ${value ? 'translate-x-7' : 'translate-x-1'}
        `}/>
      </div>

      {/* YES Label */}
      <span className={`text-xs font-bold tracking-widest transition-colors duration-300 ${value ? 'text-accent' : 'text-gray-600 group-hover:text-gray-400'}`}>
        YES
      </span>
    </div>
  );
};

export function GameLoop({ pool, question, onAnswer, history }) {
  // 1. STATE: Default to YES (true) for every new question
  const [answer, setAnswer] = useState(true);

  // Reset state when the question object changes
  useEffect(() => {
    setAnswer(true);
  }, [question]);

  const handleNext = () => {
    onAnswer(answer);
  };

  const cleanText = (text) => text ? text.replace(/\*\*/g, '').replace(/\*/g, '') : '';

  if (!question) return (
    <div className="p-8 text-center border border-gray-800 text-accent font-mono text-xs animate-pulse uppercase tracking-widest">
      Computing next node...
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Question Card */}
      <div className="border border-gray-800 bg-gray-950/50 backdrop-blur-sm p-8 md:p-12 text-center rounded-lg shadow-2xl relative overflow-hidden">
         {/* Subtle Glow Background */}
         <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-transparent opacity-50 pointer-events-none" />
         
         <div className="relative z-10 flex flex-col items-center space-y-10">
            {/* Header */}
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-gray-500">
              Sequence {String(history.length + 1).padStart(2, '0')}
            </h2>
            
            {/* The Question */}
            <p className="text-xl md:text-3xl text-gray-100 font-light leading-relaxed max-w-lg">
              {cleanText(question.text)}
            </p>

            {/* The Toggle */}
            <ToggleSwitch value={answer} onChange={setAnswer} />

            {/* The NEXT Button (Submit) */}
            <button 
              onClick={handleNext}
              className="group relative px-8 py-3 bg-gray-100 hover:bg-accent text-black transition-all duration-300 rounded-sm overflow-hidden"
            >
              <div className="relative z-10 flex items-center gap-2 font-bold text-xs uppercase tracking-[0.2em]">
                <span>Confirm</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
              {/* Button Shine Effect */}
              <div className="absolute inset-0 bg-white/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
         </div>
      </div>

      {/* Pool Stats */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900/50 border border-gray-800 rounded-full">
           <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
           <span className="text-[10px] uppercase tracking-widest text-gray-400">
             {pool.length} Candidates Remaining
           </span>
        </div>
      </div>
    </div>
  );
}