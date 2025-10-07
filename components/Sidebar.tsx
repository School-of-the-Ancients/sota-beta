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
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
  onClose?: () => void;
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
  variant = 'desktop',
  onNavigate,
  onClose,
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

  const handleNavigate = (callback: () => void) => {
    callback();
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleConversationSelect = (conversation: SavedConversation) => {
    onSelectConversation(conversation);
    if (onNavigate) {
      onNavigate();
    }
  };

  const panelClasses = [
    'bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm flex flex-col h-full',
    variant === 'desktop' ? 'lg:sticky lg:top-4 lg:max-h-[calc(100vh-4rem)]' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className="w-full flex-shrink-0">
      <div className={panelClasses}>
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-amber-300 tracking-wide">Explorer Hub</h2>
            <p className="text-sm text-gray-400">
              {isAuthenticated
                ? userEmail
                  ? `Signed in as ${userEmail}`
                  : 'Signed in traveller'
                : 'Sign in to unlock personalized features.'}
            </p>
          </div>
          {variant === 'mobile' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-700 p-2 text-gray-400 hover:text-amber-200 hover:border-amber-500/60 transition"
              aria-label="Close explorer hub"
            >
              <span aria-hidden>&times;</span>
            </button>
          )}
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
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
                    onClick={() => handleNavigate(item.onClick)}
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Recent Chats</h3>
              <button
                type="button"
                onClick={() => handleNavigate(onOpenHistory)}
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
                      onClick={() => handleConversationSelect(conversation)}
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

        <div className="pt-5 border-t border-gray-800 mt-5 text-xs text-gray-500">
          <p>
            Continue your historical journey wherever you are. Saved progress syncs across devices when you sign in.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
