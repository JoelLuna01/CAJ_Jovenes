// src/store/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../types';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: false, // Start false — we check session in background
      hydrated: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setHydrated: (hydrated) => set({ hydrated }),
      clearAuth: () => set({ user: null, profile: null, isLoading: false }),
    }),
    {
      name: 'caj-auth',
      // Only persist user and profile, not loading state
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
      }),
    }
  )
);
