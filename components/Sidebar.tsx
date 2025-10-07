import React from 'react';

import type { SavedConversation } from '../types';

type SidebarProps = {
  recentConversations: SavedConversation[];
  onSelectConversation: (conversation: SavedConversation) => void;
  onCreateAncient: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenQuests: () => void;
  currentView: string;
  isAuthenticated: boolean;
  userEmail?: string | null;
  isNavigationLocked?: boolean;
  navigationLockMessage?: string;
};

const Sidebar: React.FC<SidebarProps> = ({
  recentConversations,
  onSelectConversation,
  onCreateAncient,
  onOpenHistory,
  onOpenProfile,
  onOpenSettings,
  onOpenQuests,
  currentView,
  isAuthenticated,
  userEmail,
  isNavigationLocked = false,
  navigationLockMessage,
}) => {
  const navigationItems = [
    {
      key: 'quests',
      label: 'Quest Library',
      description: 'Browse and continue active quests.',
      onClick: onOpenQuests,
    },
    {
      key: 'creator',
      label: 'Create Ancient',
      description: 'Design a new historical guide.',
      onClick: onCreateAncient,
    },
    {
      key: 'profile',
      label: 'User Profile',
      description: 'Review your explorer identity.',
      onClick: onOpenProfile,
    },
    {
      key: 'settings',
      label: 'User Settings',
      description: 'Adjust preferences and saved options.',
      onClick: onOpenSettings,
    },
  ];

  return (
    <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-amber-300 tracking-wide">Explorer Hub</h2>
          <p className="text-sm text-gray-400">
            {isAuthenticated
              ? userEmail
                ? `Signed in as ${userEmail}`
                : 'Signed in traveller'
              : 'Sign in to unlock personalized features.'}
          </p>
          {isNavigationLocked && navigationLockMessage && (
            <p className="mt-3 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {navigationLockMessage}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Navigation</h3>
            </div>
            <div className="space-y-3">
              {navigationItems.map((item) => {
                const isActive = currentView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isNavigationLocked}
                    onClick={() => {
                      if (isNavigationLocked) {
                        return;
                      }
                      item.onClick();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 border flex flex-col gap-1 ${
                      isActive
                        ? 'border-amber-500/80 bg-amber-500/10 text-amber-200'
                        : 'border-gray-800 hover:border-amber-500/40 hover:bg-gray-800/60 text-gray-200'
                    } ${isNavigationLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Recent Chats</h3>
              <button
                type="button"
                disabled={isNavigationLocked}
                onClick={() => {
                  if (isNavigationLocked) {
                    return;
                  }
                  onOpenHistory();
                }}
                className={`text-xs text-amber-300 hover:text-amber-200 ${
                  isNavigationLocked ? 'opacity-60 cursor-not-allowed hover:text-amber-300' : ''
                }`}
              >
                View all
              </button>
            </div>

            {recentConversations.length === 0 ? (
              <p className="text-sm text-gray-400 bg-gray-800/50 border border-dashed border-gray-700 rounded-lg p-3">
                {isAuthenticated
                  ? 'Your latest conversations will appear here.'
                  : 'Sign in to start building your historical dialogue archive.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {recentConversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      disabled={isNavigationLocked}
                      onClick={() => {
                        if (isNavigationLocked) {
                          return;
                        }
                        onSelectConversation(conversation);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg border border-gray-800 transition-all duration-200 ${
                        isNavigationLocked
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:border-amber-500/40 hover:bg-gray-800/70'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-100 truncate">
                        {conversation.title ?? conversation.characterName ?? 'Conversation'}
                      </p>
                      {conversation.updatedAt && (
                        <p className="text-xs text-gray-400">
                          {new Date(conversation.updatedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                      {!conversation.updatedAt && (
                        <p className="text-xs text-gray-500">Tap to resume</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
