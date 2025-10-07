import React from 'react';

import type { SavedConversation } from '../types';

type SidebarPreferenceKey = 'immersiveAudio' | 'autoSaveNotes';

type SidebarProps = {
  userEmail?: string | null;
  isAuthenticated: boolean;
  onSignInToggle: () => void;
  onCreateAncient: () => void;
  onCreateQuest: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onResumeChat: (conversation: SavedConversation) => void;
  recentChats: SavedConversation[];
  preferences: Record<SidebarPreferenceKey, boolean>;
  onTogglePreference: (key: SidebarPreferenceKey) => void;
};

const Sidebar: React.FC<SidebarProps> = ({
  userEmail,
  isAuthenticated,
  onSignInToggle,
  onCreateAncient,
  onCreateQuest,
  onOpenProfile,
  onOpenSettings,
  onResumeChat,
  recentChats,
  preferences,
  onTogglePreference,
}) => {
  const displayName = userEmail ?? 'Guest Explorer';
  const authStatus = isAuthenticated ? 'Signed in' : 'Guest mode';

  return (
    <aside className="order-1 lg:order-2 lg:w-80 xl:w-96 flex-shrink-0">
      <div className="bg-black/30 border border-amber-500/30 rounded-2xl p-4 space-y-6 backdrop-blur">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">Profile</h2>
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-inner">
            <p className="text-lg font-semibold text-amber-100">{displayName}</p>
            <p className="text-xs uppercase tracking-widest text-amber-300/80 mt-1">{authStatus}</p>
            <button
              type="button"
              onClick={onSignInToggle}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400/60 bg-transparent px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/10"
            >
              {isAuthenticated ? 'Sign out' : 'Sign in'}
            </button>
            <div className="mt-4 space-y-2 text-sm text-amber-100/80">
              <button
                type="button"
                onClick={onOpenProfile}
                className="w-full rounded-lg bg-amber-500/20 px-3 py-2 text-left font-semibold text-amber-100 transition hover:bg-amber-500/30"
              >
                View profile
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="w-full rounded-lg bg-amber-500/20 px-3 py-2 text-left font-semibold text-amber-100 transition hover:bg-amber-500/30"
              >
                Open settings
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Quick actions</h2>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={onCreateQuest}
              className="w-full rounded-lg bg-emerald-600/80 px-3 py-2 text-left font-semibold text-emerald-50 transition hover:bg-emerald-500"
            >
              Create a quest
            </button>
            <button
              type="button"
              onClick={onCreateAncient}
              className="w-full rounded-lg border border-emerald-400/60 bg-transparent px-3 py-2 text-left font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
            >
              Forge a new ancient
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Recent chats</h2>
          <div className="mt-3 space-y-2">
            {recentChats.length === 0 && (
              <p className="text-sm text-sky-100/70">No conversations yet. Start a dialogue with a mentor!</p>
            )}
            {recentChats.map((conversation) => {
              const dateLabel = conversation.timestamp
                ? new Date(conversation.timestamp).toLocaleDateString()
                : 'Unknown date';

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onResumeChat(conversation)}
                  className="w-full rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-left text-sm text-sky-100 transition hover:bg-sky-500/20"
                >
                  <span className="block font-semibold text-sky-100">
                    {conversation.characterName ?? 'Unknown mentor'}
                  </span>
                  <span className="block text-xs text-sky-100/70">{dateLabel}</span>
                  {conversation.questTitle && (
                    <span className="mt-1 block text-xs italic text-sky-100/80">
                      Quest: {conversation.questTitle}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-300">User settings</h2>
          <div className="mt-3 space-y-3 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
            <label className="flex items-center justify-between text-sm text-purple-100">
              <span>Immersive audio</span>
              <input
                type="checkbox"
                checked={preferences.immersiveAudio}
                onChange={() => onTogglePreference('immersiveAudio')}
                className="h-4 w-4 rounded border-purple-400/60 bg-transparent text-purple-400 focus:ring-purple-300"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-purple-100">
              <span>Auto-save notes</span>
              <input
                type="checkbox"
                checked={preferences.autoSaveNotes}
                onChange={() => onTogglePreference('autoSaveNotes')}
                className="h-4 w-4 rounded border-purple-400/60 bg-transparent text-purple-400 focus:ring-purple-300"
              />
            </label>
          </div>
        </section>
      </div>
    </aside>
  );
};

export type { SidebarPreferenceKey };
export default Sidebar;
