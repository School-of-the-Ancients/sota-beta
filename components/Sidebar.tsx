import React from 'react';

import type { SavedConversation } from '../types';

export type SidebarProps = {
  isAuthenticated: boolean;
  userEmail?: string | null;
  onSignInClick: () => void;
  onCreateAncient: () => void;
  onOpenHistory: () => void;
  onOpenQuests: () => void;
  onResumeConversation: (conversation: SavedConversation) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  recentConversations: SavedConversation[];
};

const Sidebar: React.FC<SidebarProps> = ({
  isAuthenticated,
  userEmail,
  onSignInClick,
  onCreateAncient,
  onOpenHistory,
  onOpenQuests,
  onResumeConversation,
  onOpenProfile,
  onOpenSettings,
  recentConversations,
}) => {
  return (
    <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-6">
      <section className="bg-[#242424]/80 backdrop-blur rounded-2xl border border-amber-500/20 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-amber-200">User Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/30 text-amber-200 flex items-center justify-center text-lg font-bold">
            {userEmail ? userEmail.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="space-y-1 text-sm text-gray-200">
            <p>{userEmail ?? 'Guest Historian'}</p>
            <p className="text-xs text-gray-400">
              {isAuthenticated ? 'Ready for your next journey.' : 'Sign in to save your progress.'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex items-center justify-center rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/10"
          >
            View profile
          </button>
          <button
            type="button"
            onClick={onSignInClick}
            className="inline-flex items-center justify-center rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400"
          >
            {isAuthenticated ? 'Sign out' : 'Sign in'}
          </button>
        </div>
      </section>

      <section className="bg-[#242424]/80 backdrop-blur rounded-2xl border border-amber-500/20 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-amber-200">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onCreateAncient}
            className="w-full rounded-lg bg-teal-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
          >
            Create ancient
          </button>
          <button
            type="button"
            onClick={onOpenQuests}
            className="w-full rounded-lg bg-indigo-600/70 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Explore quests
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="w-full rounded-lg bg-slate-700/80 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-slate-600"
          >
            Recent chats
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/10"
          >
            User settings
          </button>
        </div>
      </section>

      <section className="bg-[#242424]/80 backdrop-blur rounded-2xl border border-amber-500/20 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-amber-200">Recent Chats</h2>
          <button
            type="button"
            onClick={onOpenHistory}
            className="text-xs text-amber-300 hover:text-amber-200"
          >
            View all
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {recentConversations.length === 0 ? (
            <p className="text-sm text-gray-400">
              No chats yet. Start a conversation to meet an ancient mind.
            </p>
          ) : (
            recentConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onResumeConversation(conversation)}
                className="w-full text-left rounded-lg border border-amber-500/20 bg-black/30 px-4 py-3 hover:bg-black/50"
              >
                <p className="text-sm font-semibold text-amber-100">
                  {conversation.characterName ?? 'Unknown ancient'}
                </p>
                {conversation.questTitle && (
                  <p className="text-xs text-amber-300">{conversation.questTitle}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(conversation.timestamp).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </section>
    </aside>
  );
};

export default Sidebar;
