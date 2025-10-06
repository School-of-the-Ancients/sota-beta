import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'sota-auth-session',
    },
  });
} else {
  console.warn(
    'Supabase environment variables are not configured. Authentication is disabled until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are provided.'
  );
}

export const supabase = client;
