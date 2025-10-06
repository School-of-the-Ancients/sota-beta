import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabaseClient } from '../supabaseClient';

type AuthState = {
  user: User | null;
  session: Session | null;
  isAuthReady: boolean;
  signInWithProvider: (provider?: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
};

const useSupabaseAuth = (): AuthState => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (!supabaseClient) {
      setIsAuthReady(true);
      return () => {
        isMounted = false;
      };
    }

    const init = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!isMounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setIsAuthReady(true);
    };

    init();

    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'github' = 'google') => {
    if (!supabaseClient) {
      console.error('Supabase client missing — unable to sign in.');
      return;
    }

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('Failed to start OAuth flow:', error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseClient) {
      setSession(null);
      setUser(null);
      return;
    }
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error('Failed to sign out:', error.message);
    }
  }, []);

  return useMemo(
    () => ({
      user,
      session,
      isAuthReady,
      signInWithProvider,
      signOut,
    }),
    [isAuthReady, session, signInWithProvider, signOut, user]
  );
};

export default useSupabaseAuth;
