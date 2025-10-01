import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/supabaseClient';
import type { Profile } from '@/types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<AuthContextValue | undefined>(undefined);

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

const mapProfile = (input: ProfileRow): Profile => ({
  id: input.id,
  email: input.email ?? null,
  displayName: input.display_name ?? null,
  avatarUrl: input.avatar_url ?? null,
  createdAt: input.created_at,
});

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      setLoading(true);
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (sessionError) {
        setError(sessionError.message);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const activeSession = data.session;
      setUser(activeSession?.user ?? null);
      if (activeSession?.user) {
        await fetchProfile(activeSession.user, false);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    const fetchProfile = async (sessionUser: User, toggleLoading = true) => {
      if (toggleLoading) {
        setLoading(true);
      }
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, created_at')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        setError(profileError.message);
        setProfile(null);
      } else if (data) {
        setProfile(mapProfile(data));
        setError(null);
      } else {
        setProfile({
          id: sessionUser.id,
          email: sessionUser.email ?? null,
          displayName: sessionUser.user_metadata?.full_name ?? null,
          avatarUrl: sessionUser.user_metadata?.avatar_url ?? null,
          createdAt: new Date().toISOString(),
        });
      }

      if (toggleLoading) {
        setLoading(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) {
        return;
      }

      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    hydrateSession();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (signInError) {
      setError(signInError.message);
    }
  };

  const signOut = async () => {
    setError(null);
    setLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
    setLoading(false);
  };

  const value = useMemo(
    () => ({ user, profile, loading, error, signInWithGoogle, signOut }),
    [user, profile, loading, error]
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

