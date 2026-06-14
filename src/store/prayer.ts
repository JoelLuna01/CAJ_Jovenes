// src/store/prayer.ts
import { create } from 'zustand';
import { PrayerRequest } from '../types';

interface PrayerState {
  requests: PrayerRequest[];
  isLoading: boolean;
  setRequests: (requests: PrayerRequest[]) => void;
  setLoading: (isLoading: boolean) => void;
  addRequest: (request: PrayerRequest) => void;
}

export const usePrayerStore = create<PrayerState>((set) => ({
  requests: [],
  isLoading: true,
  setRequests: (requests) => set({ requests }),
  setLoading: (isLoading) => set({ isLoading }),
  addRequest: (request) => set((state) => ({ requests: [request, ...state.requests] })),
}));
