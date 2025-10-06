export interface ConversationParams {
  characterId: string | null;
  resumeId: string | null;
}

export const parseConversationParams = (search: string): ConversationParams => {
  const params = new URLSearchParams(search);
  return {
    characterId: params.get('character'),
    resumeId: params.get('resume'),
  };
};
