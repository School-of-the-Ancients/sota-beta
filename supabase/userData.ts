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

  const stored = (data.data ?? {}) as Partial<UserData> & {
    apiKey?: unknown;
    apiKeys?: unknown;
  };
  const { apiKey: legacyApiKey, apiKeys: legacyApiKeys, ...storedWithoutApiKeys } = stored;

  const sanitizedUserData: UserData = {
    ...DEFAULT_USER_DATA,
    ...storedWithoutApiKeys,
    migratedAt: (data as { migrated_at?: string | null })?.migrated_at ?? stored.migratedAt ?? null,
  };

  if (legacyApiKey !== undefined || legacyApiKeys !== undefined) {
    const { error: updateError } = await client
      .from(TABLE)
      .update({
        data: sanitizedUserData,
        migrated_at: sanitizedUserData.migratedAt ?? null,
      })
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }
  }

  return sanitizedUserData;
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
