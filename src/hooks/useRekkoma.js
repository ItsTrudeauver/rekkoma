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

  const startGame = useCallback(async (searchQuery) => {
    setStage('loading');
    setError(null);
    setHistory([]);
    setSeed(searchQuery.toLowerCase());

    try {
      const initialPool = await mineTracks(searchQuery);
      setPool(initialPool);
      
      // Generate first question based on the full initial pool
      const firstQ = getNextQuestion(initialPool, [], searchQuery.toLowerCase());
      
      if (firstQ) {
        setQuestion(firstQ);
        setStage('game');
      } else {
        setStage('results');
      }
    } catch (err) {
      console.error(err);
      setError("Server busy (429). Try again in a moment.");
      setStage('input');
    }
  }, []);

  const answerQuestion = useCallback(async (userSaidYes) => {
    if (!question) return;

    // 1. SOFT SCORING (Replaces strict filtering)
    // Instead of removing tracks, we adjust their score (+1 or -1)
    let currentPool = updateTrackScores(pool, question, userSaidYes);
    
    // 2. Sort by Score (Highest confidence first)
    currentPool.sort((a, b) => (b.score || 0) - (a.score || 0));

    // 3. History Tracking
   const newHistory = [...history, question.id];
    setHistory(newHistory);

    // 4. ANCHORED EXPANSION
    // If user confirms a specific genre, try to find more tracks in that style
    if (userSaidYes && question.type === 'genre') {
      setIsExpanding(true);
      try {
        const expandedPool = await expandPool(currentPool, question.value, seed);
        // Merge and re-sort. New tracks enter with neutral score (0), 
        // which places them in the middle of the pack naturally.
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
    
    // Calculate the gap between #1 and #2
    const scoreGap = (topTrack?.score || 0) - (runnerUp?.score || 0);

    // Stop if:
    // A) We have a clear winner (gap >= 3 points)
    // B) We've asked too many questions (>= 15)
    // C) We literally ran out of candidates (<= 1)
    if (currentPool.length <= 1 || scoreGap >= 3 || newHistory.length >= 15) {
      setStage('results');
      setQuestion(null);
      return;
    }

    // 6. NEXT QUESTION GENERATION
    // Crucial: Only look at the top 20 candidates to decide the next question.
    // This prevents the AI from asking about tracks that are already "lost" (low score).
    const activeCandidates = currentPool.slice(0, 20); 
    
    const nextQ = getNextQuestion(activeCandidates, newHistory, seed);
    
    if (nextQ) {
      setQuestion(nextQ);
    } else {
      // If no good distinguishing question is found, show results
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