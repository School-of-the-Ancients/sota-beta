import type { PostgrestError } from '@supabase/supabase-js';
import { supabaseClient } from '../supabaseClient';
import type { PersistedUserData } from '../types';

const TABLE_NAME = 'user_state_snapshots';

type FetchResult = {
  data: PersistedUserData;
  error: PostgrestError | null;
};

const defaultSnapshot: PersistedUserData = {
  history: [],
  completedQuestIds: [],
  customCharacters: [],
  customQuests: [],
  activeQuestId: null,
  lastQuizResult: null,
};

export const getDefaultUserSnapshot = (): PersistedUserData => ({ ...defaultSnapshot });

export const fetchUserState = async (userId: string): Promise<FetchResult> => {
  if (!supabaseClient) {
    return {
      data: getDefaultUserSnapshot(),
      error: null,
    };
  }

  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select(
      `history, completed_quest_ids, custom_characters, custom_quests, active_quest_id, last_quiz_result`
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return {
      data: getDefaultUserSnapshot(),
      error,
    };
  }

  if (!data) {
    return {
      data: getDefaultUserSnapshot(),
      error: null,
    };
  }

  return {
    data: {
      history: data.history ?? [],
      completedQuestIds: data.completed_quest_ids ?? [],
      customCharacters: data.custom_characters ?? [],
      customQuests: data.custom_quests ?? [],
      activeQuestId: data.active_quest_id ?? null,
      lastQuizResult: data.last_quiz_result ?? null,
    },
    error: null,
  };
};

export const upsertUserState = async (userId: string, payload: PersistedUserData) => {
  if (!supabaseClient) {
    return { error: null };
  }

  const { error } = await supabaseClient.from(TABLE_NAME).upsert(
    {
      user_id: userId,
      history: payload.history,
      completed_quest_ids: payload.completedQuestIds,
      custom_characters: payload.customCharacters,
      custom_quests: payload.customQuests,
      active_quest_id: payload.activeQuestId,
      last_quiz_result: payload.lastQuizResult,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('Failed to persist user state:', error.message);
  }

  return { error };
};
