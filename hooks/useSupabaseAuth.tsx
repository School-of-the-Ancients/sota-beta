import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface EmailAuthResult {
  user: User | null;
  session: Session | null;
}

interface SupabaseAuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isLocalAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<EmailAuthResult>;
  signUpWithPassword: (email: string, password: string) => Promise<EmailAuthResult>;
  signOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const isConfigured = Boolean(supabase) && isAvailable;
  const [session, setSession] = useState<Session | null>(null);
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sota-local-auth-user');
      if (!saved) {
        return;
      }
      const parsed = JSON.parse(saved) as { id?: string; email?: string };
      if (parsed?.id && parsed?.email) {
        setLocalUser({ id: parsed.id, email: parsed.email } as User);
      }
    } catch (_error) {
      // ignore malformed local auth payload
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const getSessionWithTimeout = Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Supabase auth request timed out.')), 3500);
      }),
    ]);

    getSessionWithTimeout
      .then(({ data }) => {
        if (!cancelled) {
          setSession(data.session ?? null);
          setIsAvailable(true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setIsAvailable(false);
          setLoading(false);
        }
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase || !isAvailable) {
      throw new Error('Google sign in is unavailable while Supabase is offline. Use email sign in for local access.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }
  }, [isAvailable]);

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<EmailAuthResult> => {
    if (!supabase || !isAvailable) {
      const fallbackUser = { id: `local-${email.toLowerCase()}`, email: email.toLowerCase() } as User;
      setLocalUser(fallbackUser);
      localStorage.setItem('sota-local-auth-user', JSON.stringify({ id: fallbackUser.id, email: fallbackUser.email }));
      return {
        user: fallbackUser,
        session: null,
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      session: data.session,
    };
  }, [isAvailable]);

  const signUpWithPassword = useCallback(async (email: string, password: string): Promise<EmailAuthResult> => {
    if (!supabase || !isAvailable) {
      const fallbackUser = { id: `local-${email.toLowerCase()}`, email: email.toLowerCase() } as User;
      setLocalUser(fallbackUser);
      localStorage.setItem('sota-local-auth-user', JSON.stringify({ id: fallbackUser.id, email: fallbackUser.email }));
      return {
        user: fallbackUser,
        session: null,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      session: data.session,
    };
  }, [isAvailable]);

  const signOut = useCallback(async () => {
    setLocalUser(null);
    localStorage.removeItem('sota-local-auth-user');
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? localUser,
      session,
      loading,
      isConfigured,
      isLocalAuth: !session?.user && Boolean(localUser),
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [session, localUser, loading, isConfigured, signInWithGoogle, signInWithPassword, signUpWithPassword, signOut]
  );

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
};

export const useSupabaseAuth = (): SupabaseAuthContextValue => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
