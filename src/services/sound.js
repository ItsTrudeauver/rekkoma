// src/services/sound.js
// A simple audio synth for UI interactions. No files required. Pure math.

let audioCtx = null;
let activeTypeOsc = null; // Track the current typing oscillator to enforce monophony
let activeTypeGain = null;

// Initialize context lazily (browsers block audio until interaction)
const initAudio = () => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Generic helper for fire-and-forget sounds (Polyphonic)
const createOscillator = (type, freq, duration, vol = 0.1) => {
  try {
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio synth failed", e);
  }
};

export const SystemAudio = {
  // 1. TYPING: Monophonic, Fixed Pitch. 
  // If called while playing, it cuts the previous sound immediately.
  type: () => {
    try {
      const ctx = initAudio();
      
      // STOP previous sound if it exists (Cut-off effect)
      if (activeTypeOsc) {
        try {
          activeTypeOsc.stop();
          activeTypeOsc.disconnect();
          activeTypeGain.disconnect();
        } catch (e) {}
        activeTypeOsc = null;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      activeTypeOsc = osc;
      activeTypeGain = gain;

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime); // Fixed "System" Frequency
      
      // Short, percussive envelope
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
      
      osc.onended = () => {
        // Cleanup reference only if it hasn't been replaced
        if (activeTypeOsc === osc) {
          activeTypeOsc = null;
          activeTypeGain = null;
        }
      };

    } catch (e) {
      console.warn("Typing audio failed", e);
    }
  },

  // 2. HOVER: A subtle "chirp/hum" to indicate focus.
  hover: () => {
    createOscillator('sine', 400, 0.1, 0.02);
  },

  // 3. CLICK/CONFIRM: A heavier, lower "thud".
  click: () => {
    createOscillator('triangle', 150, 0.15, 0.1);
    // Layer a second high tone for the "digital" crunch
    setTimeout(() => createOscillator('square', 1200, 0.05, 0.02), 0);
  },
  
  // 4. ERROR/DENY: A harsh low buzz.
  error: () => {
    createOscillator('sawtooth', 100, 0.2, 0.05);
    setTimeout(() => createOscillator('sawtooth', 80, 0.2, 0.05), 50);
  }
};