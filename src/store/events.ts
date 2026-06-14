// src/store/events.ts
import { create } from 'zustand';
import { Event } from '../types';

interface EventsState {
  events: Event[];
  isLoading: boolean;
  setEvents: (events: Event[]) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  isLoading: true,
  setEvents: (events) => set({ events }),
  setLoading: (isLoading) => set({ isLoading }),
}));
