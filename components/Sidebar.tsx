import React from 'react';

import type { SavedConversation } from '../types';
import CloseIcon from './icons/CloseIcon';

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
  onRequestClose?: () => void;
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
  onRequestClose,
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

  const handleNavigation = (callback: () => void) => {
    callback();
    onRequestClose?.();
  };

  return (
    <aside className={`w-full max-w-md lg:w-72 xl:w-80 flex-shrink-0 ${className ?? ''}`}>
      <div className="relative h-full overflow-hidden rounded-3xl border border-gray-800/80 bg-gray-950/80 shadow-2xl backdrop-blur">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5" />
        <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-6 h-full">
          {onRequestClose && (
            <button
              type="button"
              onClick={onRequestClose}
              className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full border border-gray-700 bg-gray-900/80 p-2 text-gray-300 shadow-lg transition hover:text-amber-200 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 lg:hidden"
              aria-label="Close navigation"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          )}

          <div className="space-y-2">
            <h2 className="text-base font-semibold uppercase tracking-[0.3em] text-amber-300">Explorer Hub</h2>
            <p className="text-sm leading-relaxed text-gray-400">
              {isAuthenticated
                ? userEmail
                  ? `Signed in as ${userEmail}`
                  : 'Signed in traveller'
                : 'Sign in to unlock personalized features and sync your journeys.'}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800/80 bg-gray-900/80 p-4 shadow-inner">
            <p className="text-xs uppercase tracking-wide text-gray-400">Quick Links</p>
            <div className="mt-3 flex flex-col gap-3">
              {navigationItems.map((item) => {
                const isActive = currentView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavigation(item.onClick)}
                    className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-amber-400/80 bg-amber-500/10 text-amber-100 shadow-lg shadow-amber-500/10'
                        : 'border-gray-800 bg-gray-900/60 text-gray-200 hover:border-amber-400/50 hover:bg-gray-900/80'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs text-gray-400">{item.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">Recent Chats</h3>
              <button
                type="button"
                onClick={() => handleNavigation(onOpenHistory)}
                className="text-xs font-semibold text-amber-300 transition hover:text-amber-100"
              >
                View all
              </button>
            </div>

            {recentConversations.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 p-4 text-sm text-gray-400">
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
                      onClick={() => {
                        onSelectConversation(conversation);
                        onRequestClose?.();
                      }}
                      className="group w-full rounded-2xl border border-gray-800 bg-gray-900/50 px-4 py-3 text-left transition hover:border-amber-400/50 hover:bg-gray-900/80"
                    >
                      <p className="text-sm font-semibold text-gray-100 group-hover:text-amber-100">
                        {conversation.title ?? conversation.characterName ?? 'Conversation'}
                      </p>
                      {conversation.updatedAt ? (
                        <p className="text-xs text-gray-400">
                          {new Date(conversation.updatedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      ) : (
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
