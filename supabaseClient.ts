/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export let supabase: SupabaseClient | null = null;
export const authCapabilities = { allowSignup: true, googleEnabled: true };

const fetchConfiguration = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
    });
    if (!response.ok) throw new Error('SOTA backend configuration is unavailable.');
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const isPublicKey = (key: unknown): key is string => {
  if (typeof key !== 'string') return false;
  if (key.startsWith('sb_publishable_')) return true;
  try {
    const encoded = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))).role === 'anon';
  } catch {
    return false;
  }
};

export const initializeSupabase = async (): Promise<void> => {
  let url: string | undefined;
  let key: string | undefined;
  let storageKey = 'sota-auth-session';

  if (import.meta.env.PROD) {
    const base = import.meta.env.BASE_URL || '/';
    const runtime = await fetchConfiguration(base.replace(/\/$/, '') + '/sota-runtime.json');
    if (typeof runtime.configUrl !== 'string') throw new Error('Invalid SOTA runtime configuration.');
    const endpoint = new URL(runtime.configUrl);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !endpoint.pathname.endsWith('/client-config')) {
      throw new Error('Invalid SOTA configuration endpoint.');
    }
    const configuration = await fetchConfiguration(endpoint.href);
    const expectedUrl = endpoint.href.slice(0, -'/client-config'.length);
    if (configuration.url !== expectedUrl || !isPublicKey(configuration.anonKey)) {
      throw new Error('Invalid public SOTA backend configuration.');
    }
    url = configuration.url;
    key = configuration.anonKey;
    authCapabilities.allowSignup = runtime.allowSignup === true;
    authCapabilities.googleEnabled = runtime.googleEnabled === true;
    storageKey = 'sota-private-auth-session';
  } else {
    url = import.meta.env.VITE_SUPABASE_URL;
    key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  if (url && key) {
    supabase = createClient(url, key, { auth: { persistSession: true, storageKey } });
  }
};
