export const links = {
  quest: (id: string) => `/quests/${id}`,
  quiz: (id: string) => `/quiz/${id}`,
  conversation: (characterId: string, options?: { resumeId?: string | null }) => {
    const params = new URLSearchParams();
    if (characterId) {
      params.set('character', characterId);
    }
    if (options?.resumeId) {
      params.set('resume', options.resumeId);
    }
    const search = params.toString();
    return `/conversation${search ? `?${search}` : ''}`;
  },
};

export type Links = typeof links;
