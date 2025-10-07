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
  className?: string;
  onClose?: () => void;
  isMobileOverlay?: boolean;
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
  className,
  onClose,
  isMobileOverlay = false,
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

  const containerClassName = [
    'flex-shrink-0',
    'w-full',
    isMobileOverlay ? 'max-w-xs sm:max-w-sm h-full' : 'lg:w-72 xl:w-80',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={containerClassName}>
      <div className="relative h-full bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-amber-200 transition"
            aria-label="Close navigation"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        )}
        <div className="mb-6 pr-6">
          <h2 className="text-lg font-semibold text-amber-300 tracking-wide">Explorer Hub</h2>
          <p className="text-sm text-gray-400">
            {isAuthenticated
              ? userEmail
                ? `Signed in as ${userEmail}`
                : 'Signed in traveller'
              : 'Sign in to unlock personalized features.'}
          </p>
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
                    onClick={item.onClick}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 border flex flex-col gap-1 ${
                      isActive
                        ? 'border-amber-500/80 bg-amber-500/10 text-amber-200'
                        : 'border-gray-800 hover:border-amber-500/40 hover:bg-gray-800/60 text-gray-200'
                    }`}
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Recent Chats</h3>
              <button
                type="button"
                onClick={onOpenHistory}
                className="text-xs text-amber-300 hover:text-amber-200"
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
                      onClick={() => onSelectConversation(conversation)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-800 hover:border-amber-500/40 hover:bg-gray-800/70 transition-all duration-200"
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
