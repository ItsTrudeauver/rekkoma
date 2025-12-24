import { useState, useCallback } from 'react';
import { mineTracks, expandPool } from '../services/miner';
import { getNextQuestion, filterTracks } from '../utils/algorithm';

export function useRekkoma() {
  const [stage, setStage] = useState('input'); 
  const [pool, setPool] = useState([]);        
  const [history, setHistory] = useState([]);  
  const [question, setQuestion] = useState(null); 
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState(''); // This is your ANCHOR
  const [isExpanding, setIsExpanding] = useState(false);

  const startGame = useCallback(async (searchQuery) => {
    setStage('loading');
    setError(null);
    setHistory([]);
    setSeed(searchQuery.toLowerCase());

    try {
      const initialPool = await mineTracks(searchQuery);
      setPool(initialPool);
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

    // 1. Strict Filter
    let currentPool = filterTracks(pool, question, userSaidYes);
    
    // 2. History
    const tag = question.type === 'vibe' ? question.id : `genre:${question.value}`;
    const newHistory = [...history, tag];
    setHistory(newHistory);

    // 3. ANCHORED EXPANSION
    if (userSaidYes && question.type === 'genre') {
      setIsExpanding(true);
      try {
        // PASS THE SEED HERE! This fixes the drift.
        currentPool = await expandPool(currentPool, question.value, seed);
      } catch (e) {
        console.warn("Expansion failed, continuing with current pool.");
      }
      setIsExpanding(false);
    }

    setPool(currentPool);

    // 4. Win Condition
    if (currentPool.length <= 1 || newHistory.length >= 12) {
      setStage('results');
      setQuestion(null);
      return;
    }

    // 5. Next Question
    const nextQ = getNextQuestion(currentPool, newHistory, seed);
    
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