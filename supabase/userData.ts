import { supabase } from '../supabaseClient';
import type { UserData } from '../types';

export const DEFAULT_USER_DATA: UserData = {
  customCharacters: [],
  customQuests: [],
  conversations: [],
  completedQuestIds: [],
  activeQuestId: null,
  lastQuizResult: null,
  migratedAt: null,
  apiKey: null,
};

const TABLE = 'user_data';

const ensureClient = () => {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

export const fetchUserData = async (userId: string): Promise<UserData> => {
  const client = ensureClient();
  const { data, error } = await client
    .from(TABLE)
    .select('data, migrated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    await client.from(TABLE).insert({ user_id: userId, data: DEFAULT_USER_DATA });
    return { ...DEFAULT_USER_DATA };
  }

  const stored = (data.data ?? {}) as Partial<UserData>;

  const sanitizedApiKey = (() => {
    const raw = stored.apiKey as unknown;

    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const maybeCipherText = (raw as { cipherText?: unknown }).cipherText;
    const maybeIv = (raw as { iv?: unknown }).iv;
    if (typeof maybeCipherText !== 'string' || typeof maybeIv !== 'string') {
      return null;
    }

    const maybeUpdatedAt = (raw as { updatedAt?: unknown }).updatedAt;
    return {
      cipherText: maybeCipherText,
      iv: maybeIv,
      updatedAt: typeof maybeUpdatedAt === 'string' ? maybeUpdatedAt : null,
    };
  })();

  return {
    ...DEFAULT_USER_DATA,
    ...stored,
    apiKey: sanitizedApiKey,
    migratedAt: (data as { migrated_at?: string | null })?.migrated_at ?? stored.migratedAt ?? null,
  };
};

export const saveUserData = async (userId: string, payload: UserData): Promise<void> => {
  const client = ensureClient();
  const { error } = await client.from(TABLE).upsert(
    {
      user_id: userId,
      data: payload,
      migrated_at: payload.migratedAt ?? null,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw error;
  }
};
