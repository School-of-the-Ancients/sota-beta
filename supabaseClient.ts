import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (typeof supabaseUrl === 'string' && supabaseUrl && typeof supabaseAnonKey === 'string' && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'sota-beta-auth',
      autoRefreshToken: true,
    },
  });
}

export const supabase = client;

export type AppSupabaseClient = SupabaseClient | null;
