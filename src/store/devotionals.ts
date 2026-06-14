// src/store/devotionals.ts
import { create } from 'zustand';
import { Devotional } from '../types';

interface DevotionalsState {
  devotionals: Devotional[];
  isLoading: boolean;
  setDevotionals: (devotionals: Devotional[]) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useDevotionalsStore = create<DevotionalsState>((set) => ({
  devotionals: [],
  isLoading: true,
  setDevotionals: (devotionals) => set({ devotionals }),
  setLoading: (isLoading) => set({ isLoading }),
}));
