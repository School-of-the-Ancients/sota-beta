import type {
  Character,
  ConversationTurn,
  Quest,
  QuizResult,
  SavedConversation,
} from '../../types';

export const CUSTOM_CHARACTERS_KEY = 'school-of-the-ancients-custom-characters';
export const HISTORY_KEY = 'school-of-the-ancients-history';
export const COMPLETED_QUESTS_KEY = 'school-of-the-ancients-completed-quests';
export const CUSTOM_QUESTS_KEY = 'school-of-the-ancients-custom-quests';
export const ACTIVE_QUEST_KEY = 'school-of-the-ancients-active-quest-id';
export const LAST_QUIZ_RESULT_KEY = 'school-of-the-ancients-last-quiz-result';

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Failed to parse stored value:', error);
    return fallback;
  }
};

export const loadCustomCharacters = (): Character[] => {
  return safeParse<Character[]>(localStorage.getItem(CUSTOM_CHARACTERS_KEY), []);
};

export const saveCustomCharacters = (characters: Character[]) => {
  try {
    localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(characters));
  } catch (error) {
    console.error('Failed to persist custom characters:', error);
  }
};

export const loadCustomQuests = (): Quest[] => {
  return safeParse<Quest[]>(localStorage.getItem(CUSTOM_QUESTS_KEY), []);
};

export const saveCustomQuests = (quests: Quest[]) => {
  try {
    localStorage.setItem(CUSTOM_QUESTS_KEY, JSON.stringify(quests));
  } catch (error) {
    console.error('Failed to persist custom quests:', error);
  }
};

export const loadCompletedQuests = (): string[] => {
  return safeParse<string[]>(localStorage.getItem(COMPLETED_QUESTS_KEY), []);
};

export const saveCompletedQuests = (questIds: string[]) => {
  try {
    localStorage.setItem(COMPLETED_QUESTS_KEY, JSON.stringify(questIds));
  } catch (error) {
    console.error('Failed to persist completed quests:', error);
  }
};

export const loadConversations = (): SavedConversation[] => {
  return safeParse<SavedConversation[]>(localStorage.getItem(HISTORY_KEY), []);
};

export const loadConversationById = (id: string): SavedConversation | undefined => {
  const history = loadConversations();
  return history.find((conversation) => conversation.id === id);
};

export const saveConversation = (conversation: SavedConversation) => {
  try {
    const history = loadConversations();
    const existingIndex = history.findIndex((c) => c.id === conversation.id);
    if (existingIndex > -1) {
      history[existingIndex] = conversation;
    } else {
      history.unshift(conversation);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
};

export const deleteConversation = (id: string) => {
  try {
    const history = loadConversations().filter((conversation) => conversation.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to delete conversation:', error);
  }
};

export const loadActiveQuestId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_QUEST_KEY);
  } catch (error) {
    console.error('Failed to load active quest:', error);
    return null;
  }
};

export const saveActiveQuestId = (questId: string | null) => {
  try {
    if (questId) {
      localStorage.setItem(ACTIVE_QUEST_KEY, questId);
    } else {
      localStorage.removeItem(ACTIVE_QUEST_KEY);
    }
  } catch (error) {
    console.error('Failed to persist active quest:', error);
  }
};

export const loadLastQuizResult = (): QuizResult | null => {
  return safeParse<QuizResult | null>(localStorage.getItem(LAST_QUIZ_RESULT_KEY), null);
};

export const saveLastQuizResult = (result: QuizResult | null) => {
  try {
    if (result) {
      localStorage.setItem(LAST_QUIZ_RESULT_KEY, JSON.stringify(result));
    } else {
      localStorage.removeItem(LAST_QUIZ_RESULT_KEY);
    }
  } catch (error) {
    console.error('Failed to persist last quiz result:', error);
  }
};

export const transcriptToText = (transcript: ConversationTurn[]): string => {
  return transcript
    .map((turn) => `${turn.speakerName}: ${turn.text}`)
    .join('\n\n');
};
