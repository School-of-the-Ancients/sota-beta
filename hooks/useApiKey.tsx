import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface ApiKeyContextValue {
  apiKey: string | null;
  setApiKey: (nextKey: string | null) => void;
}

const ApiKeyContext = createContext<ApiKeyContextValue | undefined>(undefined);

const STORAGE_KEY = 'school-of-the-ancients-api-key';

export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to load stored API key:', error);
      return null;
    }
  });

  const setApiKey = useCallback((nextKey: string | null) => {
    setApiKeyState(nextKey ? nextKey.trim() || null : null);
    if (typeof window === 'undefined') {
      return;
    }
    try {
      if (nextKey && nextKey.trim()) {
        window.localStorage.setItem(STORAGE_KEY, nextKey.trim());
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to persist API key preference:', error);
    }
  }, []);

  const value = useMemo<ApiKeyContextValue>(() => ({ apiKey, setApiKey }), [apiKey, setApiKey]);

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
};

export const useApiKey = (): ApiKeyContextValue => {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within an ApiKeyProvider.');
  }
  return context;
};
