export const links = {
  quest: (id: string) => `/quests/${id}`,
  quiz: (id: string) => `/quiz/${id}`,
  conversation: (id: string, opts?: { resumeId?: string | null }) => {
    const params = new URLSearchParams();
    params.set('character', id);
    if (opts?.resumeId) {
      params.set('resume', opts.resumeId);
    }
    const query = params.toString();
    return `/conversation${query ? `?${query}` : ''}`;
  },
};

export type LinkHelpers = typeof links;
