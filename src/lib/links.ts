interface ConversationOptions {
  resumeId?: string | null;
}

const links = {
  quest: (id: string) => `/quests/${id}`,
  quiz: (id: string) => `/quiz/${id}`,
  conversation: (slug: string, options: ConversationOptions = {}) => {
    const params = new URLSearchParams({ character: slug });
    if (options.resumeId) {
      params.set('resume', options.resumeId);
    }
    return `/conversation?${params.toString()}`;
  },
};

export default links;
