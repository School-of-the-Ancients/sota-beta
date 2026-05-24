import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { UserData } from '../types';
import { useSupabaseAuth } from './useSupabaseAuth';
import { DEFAULT_USER_DATA, fetchUserData, saveUserData } from '../supabase/userData';

interface UserDataContextValue {
  data: UserData;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateData: (updater: (previous: UserData) => UserData) => void;
  replaceData: (next: UserData) => void;
  refresh: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  conversations: 'school-of-the-ancients-history',
  customQuests: 'school-of-the-ancients-custom-quests',
  customCharacters: 'school-of-the-ancients-custom-characters',
  completedQuests: 'school-of-the-ancients-completed-quests',
  activeQuestId: 'school-of-the-ancients-active-quest-id',
  lastQuizResult: 'school-of-the-ancients-last-quiz-result',
};

const readLocalSnapshot = (): Partial<UserData> => {
  const snapshot: Partial<UserData> = {};
  try {
    const conversations = localStorage.getItem(LOCAL_STORAGE_KEYS.conversations);
    if (conversations) {
      snapshot.conversations = JSON.parse(conversations);
    }
  } catch (error) {
    console.warn('Failed to read conversation history during migration:', error);
  }

  try {
    const customQuests = localStorage.getItem(LOCAL_STORAGE_KEYS.customQuests);
    if (customQuests) {
      snapshot.customQuests = JSON.parse(customQuests);
    }
  } catch (error) {
    console.warn('Failed to read custom quests during migration:', error);
  }

  try {
    const customCharacters = localStorage.getItem(LOCAL_STORAGE_KEYS.customCharacters);
    if (customCharacters) {
      snapshot.customCharacters = JSON.parse(customCharacters);
    }
  } catch (error) {
    console.warn('Failed to read custom characters during migration:', error);
  }

  try {
    const completedQuests = localStorage.getItem(LOCAL_STORAGE_KEYS.completedQuests);
    if (completedQuests) {
      snapshot.completedQuestIds = JSON.parse(completedQuests);
    }
  } catch (error) {
    console.warn('Failed to read completed quests during migration:', error);
  }

  try {
    const activeQuestId = localStorage.getItem(LOCAL_STORAGE_KEYS.activeQuestId);
    if (activeQuestId) {
      snapshot.activeQuestId = activeQuestId;
    }
  } catch (error) {
    console.warn('Failed to read active quest id during migration:', error);
  }

  try {
    const lastQuizResult = localStorage.getItem(LOCAL_STORAGE_KEYS.lastQuizResult);
    if (lastQuizResult) {
      snapshot.lastQuizResult = JSON.parse(lastQuizResult);
    }
  } catch (error) {
    console.warn('Failed to read last quiz result during migration:', error);
  }

  return snapshot;
};

const clearLocalSnapshot = () => {
  Object.values(LOCAL_STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear local storage key during migration:', key, error);
    }
  });
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSupabaseAuth();
  const [data, setData] = useState<UserData>({ ...DEFAULT_USER_DATA });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasMigratedRef = useRef(false);
  const pendingPersistRef = useRef<UserData | null>(null);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    async (next: UserData) => {
      if (!user) {
        return;
      }
      setSaving(true);
      try {
        await saveUserData(user.id, next);
        setError(null);
      } catch (err) {
        console.error('Failed to persist user data to Supabase', err);
        setError(err instanceof Error ? err.message : 'Failed to save user data');
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  const flushPendingPersist = useCallback(async () => {
    if (!pendingPersistRef.current) {
      return;
    }

    const payload = pendingPersistRef.current;
    pendingPersistRef.current = null;

    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }

    await persist(payload);
  }, [persist]);

  const schedulePersist = useCallback(
    (next: UserData) => {
      if (!user) {
        pendingPersistRef.current = null;
        if (persistTimeoutRef.current) {
          clearTimeout(persistTimeoutRef.current);
          persistTimeoutRef.current = null;
        }
        return;
      }

      pendingPersistRef.current = next;

      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }

      persistTimeoutRef.current = setTimeout(() => {
        void flushPendingPersist();
      }, 1500);
    },
    [flushPendingPersist, user]
  );

  const migrateFromLocalStorage = useCallback(
    async (existing: UserData) => {
      if (!user || hasMigratedRef.current) {
        return existing;
      }

      const snapshot = readLocalSnapshot();
      const hasLocalData = Boolean(
        snapshot.conversations?.length ||
          snapshot.customCharacters?.length ||
          snapshot.customQuests?.length ||
          snapshot.completedQuestIds?.length ||
          snapshot.activeQuestId ||
          snapshot.lastQuizResult
      );

      if (!hasLocalData) {
        hasMigratedRef.current = true;
        return existing;
      }

      const merged: UserData = {
        ...existing,
        ...snapshot,
        migratedAt: new Date().toISOString(),
      } as UserData;

      await persist(merged);
      clearLocalSnapshot();
      hasMigratedRef.current = true;
      return merged;
    },
    [persist, user]
  );

  const refresh = useCallback(async () => {
    if (!user) {
      setData({ ...DEFAULT_USER_DATA });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const remote = await fetchUserData(user.id);
      const withMigration = await migrateFromLocalStorage(remote);
      setData(withMigration);
      setError(null);
    } catch (err) {
      console.error('Failed to load user data from Supabase', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
      setData({ ...DEFAULT_USER_DATA });
    } finally {
      setLoading(false);
    }
  }, [migrateFromLocalStorage, user]);

  useEffect(() => {
    hasMigratedRef.current = false;
    refresh();
  }, [refresh]);

  const updateData = useCallback(
    (updater: (previous: UserData) => UserData) => {
      setData((prev) => {
        const next = updater(prev);
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist]
  );

  const replaceData = useCallback(
    (next: UserData) => {
      setData(next);
      schedulePersist(next);
    },
    [schedulePersist]
  );

  const value = useMemo<UserDataContextValue>(
    () => ({
      data,
      loading,
      saving,
      error,
      updateData,
      replaceData,
      refresh,
    }),
    [data, error, loading, replaceData, saving, updateData, refresh]
  );

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }

      if (pendingPersistRef.current) {
        void persist(pendingPersistRef.current);
        pendingPersistRef.current = null;
      }
    };
  }, [persist]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
};

export const useUserData = (): UserDataContextValue => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};
