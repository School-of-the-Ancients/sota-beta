import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface ApiKeyContextValue {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

const STORAGE_KEY = 'school-of-the-ancients-gemini-api-key';

const getProcessEnv = (): Record<string, string | undefined> | null => {
  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (!globalProcess || !globalProcess.env) {
    return null;
  }
  return globalProcess.env;
};

const readEnvApiKey = (): string | null => {
  const env = getProcessEnv();
  if (!env) {
    return null;
  }
  const candidate = env.API_KEY ?? env.GEMINI_API_KEY ?? null;
  if (!candidate) {
    return null;
  }
  const trimmed = candidate.trim();
  return trimmed ? trimmed : null;
};

const ApiKeyContext = createContext<ApiKeyContextValue | undefined>(undefined);

export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored && stored.trim()) {
      return stored;
    }
    const envKey = readEnvApiKey();
    if (envKey && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, envKey);
    }
    return envKey;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setApiKeyState(event.newValue ?? null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setApiKeyState(trimmed || null);
    if (typeof window === 'undefined') {
      return;
    }
    if (trimmed) {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearApiKey = useCallback(() => {
    setApiKeyState(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<ApiKeyContextValue>(() => ({ apiKey, setApiKey, clearApiKey }), [apiKey, setApiKey, clearApiKey]);

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
};

export const useApiKey = (): ApiKeyContextValue => {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};

export const useHasApiKey = (): boolean => {
  const { apiKey } = useApiKey();
  return Boolean(apiKey);
};
