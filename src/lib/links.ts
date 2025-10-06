interface ConversationOptions {
  resumeId?: string | null;
}

const buildQuery = (params: Record<string, string | null | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const links = {
  home: () => '/',
  quests: () => '/quests',
  quest: (id: string) => `/quests/${id}`,
  questCreator: () => '/quest/new',
  quiz: (id: string) => `/quiz/${id}`,
  conversation: (characterId: string, options: ConversationOptions = {}) => {
    return `/conversation${buildQuery({ character: characterId, resume: options.resumeId ?? undefined })}`;
  },
  history: () => '/history',
};

export type Links = typeof links;
