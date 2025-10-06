import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Character, Quest, SavedConversation, QuizResult } from '../types';
import { DEFAULT_USER_STATE, fetchUserState, persistUserState, type UserStateRecord } from '../services/userStateRepository';

interface UserDataContextValue extends UserStateRecord {
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upsertConversation: (conversation: SavedConversation) => void;
  deleteConversation: (conversationId: string) => void;
  setCompletedQuestIds: (questIds: string[]) => void;
  markQuestCompleted: (questId: string) => void;
  markQuestIncomplete: (questId: string) => void;
  upsertCustomQuest: (quest: Quest) => void;
  deleteCustomQuest: (questId: string) => void;
  upsertCustomCharacter: (character: Character) => void;
  deleteCustomCharacter: (characterId: string) => void;
  setLastQuizResult: (result: QuizResult | null) => void;
  setActiveQuestId: (questId: string | null) => void;
}

const UserDataContext = createContext<UserDataContextValue | undefined>(undefined);

interface UserDataProviderProps {
  userId: string | null;
  children: ReactNode;
}

export const UserDataProvider: React.FC<UserDataProviderProps> = ({ userId, children }) => {
  const [state, setState] = useState<UserStateRecord>(DEFAULT_USER_STATE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const initializedForUserRef = useRef<string | null>(null);

  const syncState = useCallback(
    async (nextState: UserStateRecord) => {
      if (!userId) {
        return;
      }
      setIsSyncing(true);
      try {
        await persistUserState(userId, nextState);
        setError(null);
      } catch (err) {
        console.error('Failed to persist user state', err);
        setError(err instanceof Error ? err.message : 'Failed to sync user data');
      } finally {
        setIsSyncing(false);
      }
    },
    [userId],
  );

  const hydrate = useCallback(async () => {
    if (!userId) {
      setState(DEFAULT_USER_STATE);
      setIsLoading(false);
      setError(null);
      initializedForUserRef.current = null;
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchUserState(userId);
      if (data) {
        setState(data);
      } else {
        setState(DEFAULT_USER_STATE);
      }
      setError(null);
      initializedForUserRef.current = userId;
    } catch (err) {
      console.error('Failed to load user state', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
      setState(DEFAULT_USER_STATE);
      initializedForUserRef.current = userId;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    if (!userId) {
      setState(DEFAULT_USER_STATE);
      initializedForUserRef.current = null;
      return;
    }
    if (initializedForUserRef.current === userId) {
      return;
    }
    void hydrate();
  }, [userId, hydrate]);

  const updateState = useCallback(
    (updater: (prev: UserStateRecord) => UserStateRecord) => {
      setState((prev) => {
        const next = updater(prev);
        if (userId) {
          void syncState(next);
        }
        return next;
      });
    },
    [syncState, userId],
  );

  const upsertConversation = useCallback(
    (conversation: SavedConversation) => {
      updateState((prev) => {
        const existingIndex = prev.conversations.findIndex((item) => item.id === conversation.id);
        const conversations = existingIndex > -1
          ? prev.conversations.map((item, index) => (index === existingIndex ? conversation : item))
          : [conversation, ...prev.conversations];
        return {
          ...prev,
          conversations,
        };
      });
    },
    [updateState],
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      updateState((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((conversation) => conversation.id !== conversationId),
      }));
    },
    [updateState],
  );

  const setCompletedQuestIds = useCallback(
    (questIds: string[]) => {
      updateState((prev) => ({
        ...prev,
        completedQuestIds: Array.from(new Set(questIds)),
      }));
    },
    [updateState],
  );

  const markQuestCompleted = useCallback(
    (questId: string) => {
      updateState((prev) => ({
        ...prev,
        completedQuestIds: prev.completedQuestIds.includes(questId)
          ? prev.completedQuestIds
          : [...prev.completedQuestIds, questId],
      }));
    },
    [updateState],
  );

  const markQuestIncomplete = useCallback(
    (questId: string) => {
      updateState((prev) => ({
        ...prev,
        completedQuestIds: prev.completedQuestIds.filter((id) => id !== questId),
      }));
    },
    [updateState],
  );

  const upsertCustomQuest = useCallback(
    (quest: Quest) => {
      updateState((prev) => {
        const existingIndex = prev.customQuests.findIndex((item) => item.id === quest.id);
        const customQuests = existingIndex > -1
          ? prev.customQuests.map((item, index) => (index === existingIndex ? quest : item))
          : [quest, ...prev.customQuests];
        return {
          ...prev,
          customQuests,
        };
      });
    },
    [updateState],
  );

  const deleteCustomQuest = useCallback(
    (questId: string) => {
      updateState((prev) => ({
        ...prev,
        customQuests: prev.customQuests.filter((quest) => quest.id !== questId),
        completedQuestIds: prev.completedQuestIds.filter((id) => id !== questId),
        conversations: prev.conversations.filter((conversation) => conversation.questId !== questId),
        activeQuestId: prev.activeQuestId === questId ? null : prev.activeQuestId,
      }));
    },
    [updateState],
  );

  const upsertCustomCharacter = useCallback(
    (character: Character) => {
      updateState((prev) => {
        const existingIndex = prev.customCharacters.findIndex((item) => item.id === character.id);
        const customCharacters = existingIndex > -1
          ? prev.customCharacters.map((item, index) => (index === existingIndex ? character : item))
          : [character, ...prev.customCharacters];
        return {
          ...prev,
          customCharacters,
        };
      });
    },
    [updateState],
  );

  const deleteCustomCharacter = useCallback(
    (characterId: string) => {
      updateState((prev) => ({
        ...prev,
        customCharacters: prev.customCharacters.filter((character) => character.id !== characterId),
        customQuests: prev.customQuests.filter((quest) => quest.characterId !== characterId),
        conversations: prev.conversations.filter((conversation) => conversation.characterId !== characterId),
        completedQuestIds: prev.completedQuestIds.filter((questId) => {
          const quest = prev.customQuests.find((item) => item.id === questId);
          return quest ? quest.characterId !== characterId : true;
        }),
        activeQuestId: (() => {
          if (!prev.activeQuestId) {
            return prev.activeQuestId;
          }
          const activeQuest = prev.customQuests.find((quest) => quest.id === prev.activeQuestId);
          if (activeQuest && activeQuest.characterId === characterId) {
            return null;
          }
          return prev.activeQuestId;
        })(),
      }));
    },
    [updateState],
  );

  const setLastQuizResult = useCallback(
    (result: QuizResult | null) => {
      updateState((prev) => ({
        ...prev,
        lastQuizResult: result,
      }));
    },
    [updateState],
  );

  const setActiveQuestId = useCallback(
    (questId: string | null) => {
      updateState((prev) => ({
        ...prev,
        activeQuestId: questId,
      }));
    },
    [updateState],
  );

  const value = useMemo<UserDataContextValue>(
    () => ({
      ...state,
      isLoading,
      isSyncing,
      error,
      refresh: hydrate,
      upsertConversation,
      deleteConversation,
      setCompletedQuestIds,
      markQuestCompleted,
      markQuestIncomplete,
      upsertCustomQuest,
      deleteCustomQuest,
      upsertCustomCharacter,
      deleteCustomCharacter,
      setLastQuizResult,
      setActiveQuestId,
    }),
    [
      state,
      isLoading,
      isSyncing,
      error,
      hydrate,
      upsertConversation,
      deleteConversation,
      setCompletedQuestIds,
      markQuestCompleted,
      markQuestIncomplete,
      upsertCustomQuest,
      deleteCustomQuest,
      upsertCustomCharacter,
      deleteCustomCharacter,
      setLastQuizResult,
      setActiveQuestId,
    ],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
};

export const useUserData = (): UserDataContextValue => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};
