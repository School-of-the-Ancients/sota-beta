export const links = {
  quest: (id: string) => `/quests/${id}`,
  quiz: (id: string) => `/quiz/${id}`,
  conversation: (characterId: string, options?: { resumeId?: string }) => {
    const params = new URLSearchParams({ character: characterId });
    if (options?.resumeId) {
      params.set('resume', options.resumeId);
    }
    const search = params.toString();
    return `/conversation${search ? `?${search}` : ''}`;
  },
};

export type ConversationLinkOptions = Parameters<typeof links.conversation>[1];
