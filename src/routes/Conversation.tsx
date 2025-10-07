import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConversationView from '../../components/ConversationView';
import type { Character, ConversationTurn, Quest, SavedConversation } from '../../types';
import { useTitle } from '../hooks/useTitle';

interface ConversationRouteProps {
  character: Character | null;
  activeQuest: Quest | null;
  environmentImageUrl: string | null;
  isSaving: boolean;
  resumeConversationId: string | null;
  conversationHistory: SavedConversation[];
  onEnvironmentUpdate: (url: string | null) => void;
  onConversationUpdate: (conversation: SavedConversation) => void;
  onHydrateFromParams: (characterId: string | null, resumeId: string | null) => void;
  onEndConversation: (transcript: ConversationTurn[], sessionId: string) => Promise<void> | void;
}

const ConversationRoute: React.FC<ConversationRouteProps> = ({
  character,
  activeQuest,
  environmentImageUrl,
  isSaving,
  resumeConversationId,
  conversationHistory,
  onEnvironmentUpdate,
  onConversationUpdate,
  onHydrateFromParams,
  onEndConversation,
}) => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const characterId = searchParams.get('character');
    const resumeId = searchParams.get('resume');
    onHydrateFromParams(characterId, resumeId);
  }, [onHydrateFromParams, searchParams]);

  useTitle(character ? `${character.name} • School of the Ancients` : 'Conversation • School of the Ancients');

  if (!character) {
    return (
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-8 text-center text-gray-300">
        <h2 className="text-2xl font-semibold text-amber-200 mb-3">Choose a mentor to begin</h2>
        <p className="text-sm text-gray-400">
          Select an ancient guide from the home screen to start a conversation.
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
