import React from 'react';
import ConversationView from '@/components/ConversationView';
import type {
  Character,
  ConversationTurn,
  Quest,
  SavedConversation,
} from '@/types';

type ConversationRouteProps = {
  character: Character | null;
  environmentImageUrl: string | null;
  onEnvironmentUpdate: (url: string | null) => void;
  activeQuest: Quest | null;
  isSaving: boolean;
  resumeConversationId: string | null;
  conversationHistory: SavedConversation[];
  onConversationUpdate: (conversation: SavedConversation) => void;
  onEndConversation: (transcript: ConversationTurn[], sessionId: string) => void;
};

const ConversationRoute: React.FC<ConversationRouteProps> = ({
  character,
  environmentImageUrl,
  onEnvironmentUpdate,
  activeQuest,
  isSaving,
  resumeConversationId,
  conversationHistory,
  onConversationUpdate,
  onEndConversation,
}) => {
  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-gray-300 bg-gray-900/60 border border-gray-800 rounded-2xl p-8 animate-fade-in">
        <h2 className="text-2xl font-semibold text-amber-200 mb-2">Choose a mentor to begin</h2>
        <p className="max-w-lg text-sm text-gray-400">
          Select a historical guide from the hub to start your conversation. You can also resume a saved quest from your
          conversation history.
        </p>
      </div>
    );
  }

  return (
    <ConversationView
      character={character}
      onEndConversation={onEndConversation}
      environmentImageUrl={environmentImageUrl}
      onEnvironmentUpdate={onEnvironmentUpdate}
      activeQuest={activeQuest}
      isSaving={isSaving}
      resumeConversationId={resumeConversationId}
      conversationHistory={conversationHistory}
      onConversationUpdate={onConversationUpdate}
    />
  );
};

export default ConversationRoute;
