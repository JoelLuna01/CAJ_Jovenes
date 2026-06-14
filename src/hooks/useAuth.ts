// src/hooks/useAuth.ts
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { UserProfile } from '../types';

export const useAuth = () => {
  const { user, profile, isLoading, setUser, setProfile, setLoading, clearAuth } = useAuthStore();

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (!error && data) {
        setProfile(data as UserProfile);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        clearAuth();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading, clearAuth]);

  return { user, profile, isLoading };
};
