// src/hooks/useRekkoma.js
import { useState, useCallback } from 'react';
import { mineTracks, expandPool } from '../services/miner';
import { getNextQuestion, updateTrackScores } from '../utils/algorithm';

export function useRekkoma() {
  const [stage, setStage] = useState('input'); 
  const [pool, setPool] = useState([]);        
  const [history, setHistory] = useState([]);  
  const [question, setQuestion] = useState(null); 
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState(''); 
  const [isExpanding, setIsExpanding] = useState(false);

  // UPDATED: Accepts popRange argument
  const startGame = useCallback(async (searchQuery, popRange = { min: 0, max: 100 }) => {
    setStage('loading');
    setError(null);
    setHistory([]);
    setSeed(searchQuery.toLowerCase());

    try {
      // FIX: Pass popRange to mineTracks so it can fetch deeper if needed
      const initialPool = await mineTracks(searchQuery, popRange);
      
      // Note: Filtering is now handled inside mineTracks to ensure we get enough results
      // even for low popularity ranges.

      if (initialPool.length === 0) {
        throw new Error("No tracks found in that popularity range. Try widening the sliders.");
      }

      setPool(initialPool);
      
      // Generate first question based on the filtered pool
      const firstQ = getNextQuestion(initialPool, [], searchQuery.toLowerCase());
      
      if (firstQ) {
        setQuestion(firstQ);
        setStage('game');
      } else {
        setStage('results');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Server busy (429). Try again in a moment.");
      setStage('input');
    }
  }, []);

  const answerQuestion = useCallback(async (userSaidYes) => {
    if (!question) return;

    // 1. SOFT SCORING
    let currentPool = updateTrackScores(pool, question, userSaidYes);
    
    // 2. Sort by Score
    currentPool.sort((a, b) => (b.score || 0) - (a.score || 0));

    // 3. History Tracking
   const newHistory = [...history, question.id];
    setHistory(newHistory);

    // 4. ANCHORED EXPANSION
    if (userSaidYes && question.type === 'genre') {
      setIsExpanding(true);
      try {
        const expandedPool = await expandPool(currentPool, question.value, seed);
        currentPool = expandedPool.map(t => ({
          ...t,
          score: t.score !== undefined ? t.score : 0 
        }));
        currentPool.sort((a, b) => (b.score || 0) - (a.score || 0));
      } catch (e) {
        console.warn("Expansion failed, continuing with current pool.");
      }
      setIsExpanding(false);
    }

    setPool(currentPool);

    // 5. WIN CONDITION CHECK
    const topTrack = currentPool[0];
    const runnerUp = currentPool[1];
    
    const scoreGap = (topTrack?.score || 0) - (runnerUp?.score || 0);

    if (currentPool.length <= 1 || scoreGap >= 3 || newHistory.length >= 15) {
      setStage('results');
      setQuestion(null);
      return;
    }

    // 6. NEXT QUESTION GENERATION
    const activeCandidates = currentPool.slice(0, 20); 
    const nextQ = getNextQuestion(activeCandidates, newHistory, seed);
    
    if (nextQ) {
      setQuestion(nextQ);
    } else {
      setStage('results');
    }
  }, [pool, question, history, seed]);

  const reset = useCallback(() => {
    setStage('input');
    setPool([]);
    setHistory([]);
    setQuestion(null);
    setError(null);
    setSeed('');
  }, []);

  return { stage, pool, question, error, isExpanding, actions: { startGame, answerQuestion, reset } };
}