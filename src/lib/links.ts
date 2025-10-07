export const links = {
  quest: (id: string) => `/quests/${id}`,
  quiz: (id: string) => `/quiz/${id}`,
  conversation: (id: string, options?: { resumeId?: string | null }) => {
    const search = new URLSearchParams();
    if (id) {
      search.set('character', id);
    }
    if (options?.resumeId) {
      search.set('resume', options.resumeId);
    }
    const query = search.toString();
    return `/conversation${query ? `?${query}` : ''}`;
  },
};

export type LinksHelper = typeof links;
