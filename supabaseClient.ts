import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Database = Record<string, never>;

const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient<Database> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
} else {
  if (import.meta?.env?.MODE !== 'test') {
    console.warn(
      'Supabase client not initialized — missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth will be disabled.'
    );
  }
}

export const supabaseClient = client;
export const isSupabaseConfigured = Boolean(client);
