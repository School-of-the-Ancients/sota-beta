import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

type AuthMode = 'signIn' | 'signUp';

export interface SupabaseAuthState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isConfigured: boolean;
}

const formatAuthError = (error: AuthError | Error | null) => {
  if (!error) {
    return null;
  }
  if ('message' in error) {
    return error.message;
  }
  return 'Unexpected authentication error';
};

export const useSupabaseAuth = (): SupabaseAuthState => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(isSupabaseConfigured));
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const hydrateSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (sessionError) {
          setError(formatAuthError(sessionError));
          setSession(null);
          return;
        }
        setSession(data.session ?? null);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(formatAuthError(err as Error));
        setSession(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void hydrateSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) {
        return;
      }
      setSession(newSession ?? null);
      setError(null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(formatAuthError(authError));
        return;
      }
      setError(null);
    } catch (err) {
      setError(formatAuthError(err as Error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }
    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setError(formatAuthError(authError));
        return;
      }
      setError(null);
    } catch (err) {
      setError(formatAuthError(err as Error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setSession(null);
      return;
    }
    setIsLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(formatAuthError(signOutError));
        return;
      }
      setError(null);
    } catch (err) {
      setError(formatAuthError(err as Error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setSession(null);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error: refreshError } = await supabase.auth.getSession();
      if (refreshError) {
        setError(formatAuthError(refreshError));
        setSession(null);
        return;
      }
      setSession(data.session ?? null);
      setError(null);
    } catch (err) {
      setError(formatAuthError(err as Error));
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return useMemo(
    () => ({
      session,
      isLoading,
      error,
      authMode,
      setAuthMode,
      signIn,
      signUp,
      signOut,
      refreshSession,
      isConfigured: isSupabaseConfigured,
    }),
    [session, isLoading, error, authMode, signIn, signUp, signOut, refreshSession],
  );
};
