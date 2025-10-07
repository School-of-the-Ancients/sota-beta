import React from 'react';

import type { SavedConversation } from '../types';

interface SidebarProps {
  isAuthenticated: boolean;
  userEmail?: string | null;
  completedQuestCount: number;
  totalQuestCount: number;
  recentConversations: SavedConversation[];
  onResumeConversation: (conversation: SavedConversation) => void;
  onOpenHistory: () => void;
  onCreateAncient: () => void;
  onOpenQuestCreator: () => void;
  onOpenQuests: () => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isAuthenticated,
  userEmail,
  completedQuestCount,
  totalQuestCount,
  recentConversations,
  onResumeConversation,
  onOpenHistory,
  onCreateAncient,
  onOpenQuestCreator,
  onOpenQuests,
  onOpenSettings,
}) => {
  const completionPercent = totalQuestCount > 0 ? Math.round((completedQuestCount / totalQuestCount) * 100) : 0;
  const visibleConversations = recentConversations.slice(0, 4);

  return (
    <aside className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur">
      <div className="space-y-6">
        <section>
          <h2 className="text-sm uppercase tracking-widest text-amber-400 font-semibold mb-2">User Profile</h2>
          {isAuthenticated ? (
            <div className="rounded-xl bg-black/30 border border-gray-800 p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Signed in as</p>
                <p className="text-sm text-gray-100 truncate">{userEmail ?? 'Unknown user'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Quest progress</p>
                <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, completionPercent)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {completedQuestCount} of {totalQuestCount} quests complete
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenSettings}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
              >
                User Settings
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Sign in to save ancients, track quests, and revisit your conversations.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-widest text-amber-400 font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={onCreateAncient}
              className="w-full rounded-lg bg-emerald-700/80 px-4 py-3 text-sm font-semibold text-emerald-50 hover:bg-emerald-600"
            >
              Create Ancient
            </button>
            <button
              type="button"
              onClick={onOpenQuests}
              className="w-full rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-black hover:bg-amber-500"
            >
              Browse Quests
            </button>
            <button
              type="button"
              onClick={onOpenQuestCreator}
              className="w-full rounded-lg bg-teal-700/80 px-4 py-3 text-sm font-semibold text-teal-50 hover:bg-teal-600"
            >
              Create Quest
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-amber-400 font-semibold">Recent Chats</h2>
            {recentConversations.length > 0 && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="text-xs text-amber-300 hover:text-amber-200"
              >
                View all
              </button>
            )}
          </div>

          {visibleConversations.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Your recent conversations will appear here.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {visibleConversations.map((conversation) => (
                <li
                  key={conversation.id}
                  className="rounded-xl border border-gray-800 bg-black/30 p-3 hover:border-amber-500/40 transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-100">{conversation.characterName}</p>
                  <p className="text-xs text-gray-500">
                    {conversation.questTitle ?? 'Free conversation'} •{' '}
                    {new Date(conversation.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => onResumeConversation(conversation)}
                    className="mt-2 inline-flex items-center rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                  >
                    Resume chat
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
};

export default Sidebar;
