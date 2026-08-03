import { createStore } from 'zustand/vanilla';

interface GameState {
  phase: 'boot' | 'playing' | 'gameover';
  fps: number;
  health: number;
  maxHealth: number;
  bombs: number;
  wave: number;
  score: number;
  setPhase: (phase: 'boot' | 'playing' | 'gameover') => void;
  setFps: (fps: number) => void;
  setHealth: (health: number) => void;
  setBombs: (bombs: number) => void;
  setWave: (wave: number) => void;
  addScore: (amount: number) => void;
  reset: () => void;
}

const initialState = {
  phase: 'boot' as const,
  fps: 0,
  health: 100,
  maxHealth: 100,
  bombs: 3,
  wave: 0,
  score: 0,
};

export const useGameStore = createStore<GameState>()((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setFps: (fps) => set({ fps }),
  setHealth: (health) => set({ health }),
  setBombs: (bombs) => set({ bombs }),
  setWave: (wave) => set({ wave }),
  addScore: (amount) => set((s) => ({ score: s.score + amount })),
  reset: () => set({ ...initialState }),
}));
