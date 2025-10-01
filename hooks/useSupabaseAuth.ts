import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import type { UserProfile } from '../types';

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

const mapProfile = (row: ProfileRow | null): UserProfile | null => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
};

const useSupabaseAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, created_at')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Failed to load profile:', error.message);
      setError(error.message);
      setProfile(null);
      return;
    }

    setProfile(mapProfile(data as ProfileRow));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (error) {
        console.error('Failed to get session:', error.message);
        setError(error.message);
        setSession(null);
        setProfile(null);
      } else {
        setSession(data.session);
        await fetchProfile(data.session?.user ?? null);
      }

      setIsLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) {
        return;
      }

      setSession(newSession);
      await fetchProfile(newSession?.user ?? null);
      setError(null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signInWithSSO = useCallback(async (domain: string) => {
    const normalizedDomain = domain.trim();
    if (!normalizedDomain) {
      throw new Error('Please provide your organization domain.');
    }

    const { error } = await supabase.auth.signInWithSSO({
      domain: normalizedDomain,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  return {
    session,
    user: session?.user ?? null,
    profile,
    isLoading,
    error,
    signInWithGoogle,
    signInWithSSO,
    signOut,
  };
};

export default useSupabaseAuth;
