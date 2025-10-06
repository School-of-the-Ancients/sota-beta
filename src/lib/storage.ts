import type {
  Character,
  ConversationTurn,
  Quest,
  QuizResult,
  SavedConversation,
} from '../types';

export const STORAGE_KEYS = {
  customCharacters: 'school-of-the-ancients-custom-characters',
  history: 'school-of-the-ancients-history',
  completedQuests: 'school-of-the-ancients-completed-quests',
  customQuests: 'school-of-the-ancients-custom-quests',
  activeQuest: 'school-of-the-ancients-active-quest-id',
  lastQuizResult: 'school-of-the-ancients-last-quiz-result',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const readJson = <T>(key: StorageKey): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to read storage key ${key}:`, error);
    return null;
  }
};

const writeJson = (key: StorageKey, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to persist storage key ${key}:`, error);
  }
};

export const loadCustomCharacters = (): Character[] => {
  return readJson<Character[]>(STORAGE_KEYS.customCharacters) ?? [];
};

export const saveCustomCharacters = (characters: Character[]) => {
  writeJson(STORAGE_KEYS.customCharacters, characters);
};

export const loadCustomQuests = (): Quest[] => {
  return readJson<Quest[]>(STORAGE_KEYS.customQuests) ?? [];
};

export const saveCustomQuests = (quests: Quest[]) => {
  writeJson(STORAGE_KEYS.customQuests, quests);
};

export const loadCompletedQuests = (): string[] => {
  return readJson<string[]>(STORAGE_KEYS.completedQuests) ?? [];
};

export const saveCompletedQuests = (questIds: string[]) => {
  writeJson(STORAGE_KEYS.completedQuests, questIds);
};

export const loadLastQuizResult = (): QuizResult | null => {
  return readJson<QuizResult>(STORAGE_KEYS.lastQuizResult);
};

export const saveLastQuizResult = (result: QuizResult | null) => {
  if (result) {
    writeJson(STORAGE_KEYS.lastQuizResult, result);
  } else {
    try {
      localStorage.removeItem(STORAGE_KEYS.lastQuizResult);
    } catch (error) {
      console.error('Failed to clear last quiz result:', error);
    }
  }
};

export const loadActiveQuestId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.activeQuest);
  } catch (error) {
    console.error('Failed to read active quest id:', error);
    return null;
  }
};

export const saveActiveQuestId = (questId: string | null) => {
  try {
    if (questId) {
      localStorage.setItem(STORAGE_KEYS.activeQuest, questId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeQuest);
    }
  } catch (error) {
    console.error('Failed to persist active quest id:', error);
  }
};

export const loadConversations = (): SavedConversation[] => {
  return readJson<SavedConversation[]>(STORAGE_KEYS.history) ?? [];
};

export const saveConversation = (conversation: SavedConversation) => {
  try {
    const history = loadConversations();
    const index = history.findIndex((item) => item.id === conversation.id);
    if (index >= 0) {
      history[index] = conversation;
    } else {
      history.unshift(conversation);
    }
    writeJson(STORAGE_KEYS.history, history);
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
};

export const deleteConversation = (conversationId: string) => {
  try {
    const history = loadConversations().filter((item) => item.id !== conversationId);
    writeJson(STORAGE_KEYS.history, history);
  } catch (error) {
    console.error('Failed to delete conversation:', error);
  }
};

export const findConversationById = (conversationId: string): SavedConversation | null => {
  const history = loadConversations();
  return history.find((item) => item.id === conversationId) ?? null;
};

export const findConversationByQuest = (questId: string): SavedConversation | null => {
  const history = loadConversations();
  return history.find((item) => item.questId === questId) ?? null;
};

export const createConversationRecord = (
  params: Omit<SavedConversation, 'timestamp'> & { transcript: ConversationTurn[] }
): SavedConversation => {
  return {
    ...params,
    timestamp: Date.now(),
  };
};
