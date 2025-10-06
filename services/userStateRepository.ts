import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Character, Quest, SavedConversation, QuizResult } from '../types';

export interface UserStateRecord {
  conversations: SavedConversation[];
  completedQuestIds: string[];
  customQuests: Quest[];
  customCharacters: Character[];
  lastQuizResult: QuizResult | null;
  activeQuestId: string | null;
}

export const DEFAULT_USER_STATE: UserStateRecord = {
  conversations: [],
  completedQuestIds: [],
  customQuests: [],
  customCharacters: [],
  lastQuizResult: null,
  activeQuestId: null,
};

const TABLE_NAME = 'user_state';

const isRowNotFoundError = (error: PostgrestError | null) => {
  if (!error) {
    return false;
  }
  return error.code === 'PGRST116' || error.details?.includes('Results contain 0 rows');
};

export const fetchUserState = async (userId: string): Promise<UserStateRecord | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isRowNotFoundError(error)) {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  const state = data.state as UserStateRecord | null;
  if (!state) {
    return null;
  }

  return {
    ...DEFAULT_USER_STATE,
    ...state,
  };
};

export const persistUserState = async (userId: string, state: UserStateRecord): Promise<void> => {
  if (!supabase) {
    return;
  }

  const payload = {
    user_id: userId,
    state,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw error;
  }
};
