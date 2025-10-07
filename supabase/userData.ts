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

  const sanitizedUserData: UserData = {
    ...DEFAULT_USER_DATA,
    ...stored,
    apiKey: sanitizedApiKey,
    migratedAt: (data as { migrated_at?: string | null })?.migrated_at ?? stored.migratedAt ?? null,
  };

  const rawApiKey = stored.apiKey as unknown;
  let shouldPersistSanitized = false;

  if (rawApiKey !== undefined) {
    if (rawApiKey === null) {
      shouldPersistSanitized = sanitizedApiKey !== null;
    } else if (typeof rawApiKey !== 'object') {
      shouldPersistSanitized = true;
    } else {
      const rawCipherText = (rawApiKey as { cipherText?: unknown }).cipherText;
      const rawIv = (rawApiKey as { iv?: unknown }).iv;

      if (typeof rawCipherText !== 'string' || typeof rawIv !== 'string') {
        shouldPersistSanitized = true;
      } else if (!sanitizedApiKey) {
        shouldPersistSanitized = true;
      } else {
        if (
          rawCipherText !== sanitizedApiKey.cipherText ||
          rawIv !== sanitizedApiKey.iv
        ) {
          shouldPersistSanitized = true;
        } else {
          const rawUpdatedAt = (rawApiKey as { updatedAt?: unknown }).updatedAt;

          if (typeof rawUpdatedAt === 'string') {
            if (rawUpdatedAt !== sanitizedApiKey.updatedAt) {
              shouldPersistSanitized = true;
            }
          } else if (rawUpdatedAt !== null && rawUpdatedAt !== undefined) {
            shouldPersistSanitized = true;
          } else if (sanitizedApiKey.updatedAt !== null) {
            shouldPersistSanitized = true;
          }
        }
      }
    }
  }

  if (shouldPersistSanitized) {
    const { error: updateError } = await client
      .from(TABLE)
      .update({ data: sanitizedUserData })
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
