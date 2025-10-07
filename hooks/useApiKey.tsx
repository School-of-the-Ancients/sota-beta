import React, { createContext, useContext } from 'react';

interface ApiKeyContextValue {
  apiKey: string | null;
}

const ApiKeyContext = createContext<ApiKeyContextValue | undefined>(undefined);

export const ApiKeyProvider: React.FC<{ apiKey: string | null; children: React.ReactNode }> = ({ apiKey, children }) => (
  <ApiKeyContext.Provider value={{ apiKey }}>{children}</ApiKeyContext.Provider>
);

export const useApiKey = (): ApiKeyContextValue => {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};
