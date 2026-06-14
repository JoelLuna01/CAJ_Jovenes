// src/store/notes.ts
import { create } from 'zustand';
import { Note } from '../types';

interface NotesState {
  notes: Note[];
  isLoading: boolean;
  setNotes: (notes: Note[]) => void;
  setLoading: (isLoading: boolean) => void;
  addNote: (note: Note) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  isLoading: true,
  setNotes: (notes) => set({ notes }),
  setLoading: (isLoading) => set({ isLoading }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
}));
