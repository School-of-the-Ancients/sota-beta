export interface ConversationParams {
  characterSlug: string | null;
  resumeId: string | null;
}

export const parseConversationSearch = (search: string): ConversationParams => {
  const params = new URLSearchParams(search);
  const characterSlug = params.get('character');
  const resumeId = params.get('resume');
  return {
    characterSlug,
    resumeId,
  };
};

export const buildConversationSearch = (slug: string, resumeId?: string | null) => {
  const params = new URLSearchParams({ character: slug });
  if (resumeId) {
    params.set('resume', resumeId);
  }
  return params.toString();
};
