import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  Character,
  ConversationSessionState,
  ConversationTurn,
  Quest,
  SavedConversation,
} from '../../types';
import ConversationView from '../../components/ConversationView';

interface ConversationRouteProps {
  character: Character | null;
  activeQuest: Quest | null;
  isSaving: boolean;
  environmentImageUrl: string | null;
  onEnvironmentUpdate: (url: string | null) => void;
  resumeConversationId: string | null;
  conversationHistory: SavedConversation[];
  onConversationUpdate: (conversation: SavedConversation) => void;
  onEndConversation: (transcript: ConversationTurn[], sessionId: string) => Promise<void> | void;
  onHydrateFromParams: (characterId: string | null, resumeId: string | null) => void;
  isAppLoading: boolean;
  onSessionStateChange: (state: ConversationSessionState | null) => void;
}

const ConversationRoute: React.FC<ConversationRouteProps> = ({
  character,
  activeQuest,
  isSaving,
  environmentImageUrl,
  onEnvironmentUpdate,
  resumeConversationId,
  conversationHistory,
  onConversationUpdate,
  onEndConversation,
  onHydrateFromParams,
  isAppLoading,
  onSessionStateChange,
}) => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isAppLoading) {
      return;
    }
    const characterId = searchParams.get('character');
    const resumeId = searchParams.get('resume');
    onHydrateFromParams(characterId, resumeId);
  }, [isAppLoading, onHydrateFromParams, searchParams]);

  if (!character) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-gray-300">
        <p className="text-lg">Select a mentor from the hub to begin a conversation.</p>
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
      onSessionStateChange={onSessionStateChange}
    />
  );
};

export default ConversationRoute;
