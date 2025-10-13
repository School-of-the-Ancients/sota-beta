import { supabase } from '../supabaseClient';
import type { StoredApiKey, UserData } from '../types';

export const DEFAULT_USER_DATA: UserData = {
  customCharacters: [],
  customQuests: [],
  conversations: [],
  completedQuestIds: [],
  activeQuestId: null,
  lastQuizResult: null,
  migratedAt: null,
  apiKey: null,
  apiKeys: {},
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

  const normalizeTimestamp = (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return null;
    }

    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return null;
    }

    return value;
  };

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
    const maybeDeviceId = (raw as { deviceId?: unknown }).deviceId;
    return {
      cipherText: maybeCipherText,
      iv: maybeIv,
      updatedAt: normalizeTimestamp(maybeUpdatedAt),
      deviceId: typeof maybeDeviceId === 'string' ? maybeDeviceId : null,
    };
  })();

  const sanitizedApiKeys = (() => {
    const raw = (stored as { apiKeys?: unknown }).apiKeys;

    if (!raw || typeof raw !== 'object') {
      return {} as Record<string, StoredApiKey>;
    }

    const entries: Record<string, StoredApiKey> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([deviceId, value]) => {
      if (!value || typeof value !== 'object') {
        return;
      }

      const maybeCipherText = (value as { cipherText?: unknown }).cipherText;
      const maybeIv = (value as { iv?: unknown }).iv;
      if (typeof maybeCipherText !== 'string' || typeof maybeIv !== 'string') {
        return;
      }

      const maybeUpdatedAt = (value as { updatedAt?: unknown }).updatedAt;
      const maybeDeviceId = (value as { deviceId?: unknown }).deviceId;

      entries[deviceId] = {
        cipherText: maybeCipherText,
        iv: maybeIv,
        updatedAt: normalizeTimestamp(maybeUpdatedAt),
        deviceId: typeof maybeDeviceId === 'string' ? maybeDeviceId : null,
      };
    });

    return entries;
  })();

  const sanitizedUserData: UserData = {
    ...DEFAULT_USER_DATA,
    ...stored,
    apiKey: sanitizedApiKey,
    apiKeys: sanitizedApiKeys,
    migratedAt: (data as { migrated_at?: string | null })?.migrated_at ?? stored.migratedAt ?? null,
  };

  const rawApiKey = stored.apiKey as unknown;
  const rawApiKeys = (stored as { apiKeys?: unknown }).apiKeys;
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
          const normalizedRawUpdatedAt = normalizeTimestamp(rawUpdatedAt);
          const normalizedSanitizedUpdatedAt = sanitizedApiKey.updatedAt ?? null;

          if (normalizedRawUpdatedAt !== normalizedSanitizedUpdatedAt) {
            shouldPersistSanitized = true;
          }

          const rawDeviceId = (rawApiKey as { deviceId?: unknown }).deviceId;
          const normalizedRawDeviceId =
            typeof rawDeviceId === 'string' ? rawDeviceId : rawDeviceId === null ? null : undefined;
          const normalizedSanitizedDeviceId = sanitizedApiKey.deviceId ?? null;

          if (normalizedRawDeviceId === undefined) {
            if (normalizedSanitizedDeviceId !== null) {
              shouldPersistSanitized = true;
            }
          } else if (normalizedRawDeviceId !== normalizedSanitizedDeviceId) {
            shouldPersistSanitized = true;
          }
        }
      }
    }
  }

  if (rawApiKeys !== undefined) {
    if (!rawApiKeys || typeof rawApiKeys !== 'object') {
      if (Object.keys(sanitizedApiKeys).length > 0) {
        shouldPersistSanitized = true;
      }
    } else {
      const rawEntries = rawApiKeys as Record<string, unknown>;
      const sanitizedKeys = Object.keys(sanitizedApiKeys);
      const rawKeys = Object.keys(rawEntries);

      if (sanitizedKeys.length !== rawKeys.length) {
        shouldPersistSanitized = true;
      } else {
        for (const key of sanitizedKeys) {
          const sanitizedEntry = sanitizedApiKeys[key];
          const rawEntry = rawEntries[key];

          if (!rawEntry || typeof rawEntry !== 'object') {
            shouldPersistSanitized = true;
            break;
          }

          const rawCipherText = (rawEntry as { cipherText?: unknown }).cipherText;
          const rawIv = (rawEntry as { iv?: unknown }).iv;
          if (typeof rawCipherText !== 'string' || typeof rawIv !== 'string') {
            shouldPersistSanitized = true;
            break;
          }

          if (rawCipherText !== sanitizedEntry.cipherText || rawIv !== sanitizedEntry.iv) {
            shouldPersistSanitized = true;
            break;
          }

          const rawUpdatedAt = (rawEntry as { updatedAt?: unknown }).updatedAt;
          const normalizedRawUpdatedAt = normalizeTimestamp(rawUpdatedAt);
          const normalizedSanitizedUpdatedAt = sanitizedEntry.updatedAt ?? null;

          if (normalizedRawUpdatedAt !== normalizedSanitizedUpdatedAt) {
            shouldPersistSanitized = true;
            break;
          }

          const rawDeviceId = (rawEntry as { deviceId?: unknown }).deviceId;
          const normalizedRawDeviceId =
            typeof rawDeviceId === 'string' ? rawDeviceId : rawDeviceId === null ? null : undefined;
          const normalizedSanitizedDeviceId = sanitizedEntry.deviceId ?? null;

          if (normalizedRawDeviceId === undefined) {
            if (normalizedSanitizedDeviceId !== null) {
              shouldPersistSanitized = true;
              break;
            }
          } else if (normalizedRawDeviceId !== normalizedSanitizedDeviceId) {
            shouldPersistSanitized = true;
            break;
          }
        }
      }
    }
  }

  if (shouldPersistSanitized) {
    const sanitizedUpdatePayload = {
      data: sanitizedUserData,
      migrated_at: sanitizedUserData.migratedAt ?? null,
    };

    const { error: updateError } = await client
      .from(TABLE)
      .update(sanitizedUpdatePayload)
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
