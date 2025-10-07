import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import ConversationView from '../../components/ConversationView';
import type {
  Character,
  ConversationTurn,
  Quest,
  SavedConversation,
} from '../../types';

interface ConversationRouteProps {
  selectedCharacter: Character | null;
  conversationHistory: SavedConversation[];
  resumeConversationId: string | null;
  environmentImageUrl: string | null;
  activeQuest: Quest | null;
  isSaving: boolean;
  isAuthenticated: boolean;
  onEnvironmentUpdate: (value: string | null) => void;
  onConversationUpdate: (conversation: SavedConversation) => void;
  onEndConversation: (transcript: ConversationTurn[], sessionId: string) => Promise<void>;
  onHydrateFromParams: (
    params: { characterId: string | null; resumeId: string | null }
  ) => { validResume: boolean };
}

const ConversationRoute: React.FC<ConversationRouteProps> = ({
  selectedCharacter,
  conversationHistory,
  resumeConversationId,
  environmentImageUrl,
  activeQuest,
  isSaving,
  isAuthenticated,
  onEnvironmentUpdate,
  onConversationUpdate,
  onEndConversation,
  onHydrateFromParams,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const characterId = searchParams.get('character');
    const resumeId = searchParams.get('resume');
    const { validResume } = onHydrateFromParams({ characterId, resumeId });
    if (resumeId && !validResume) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('resume');
      setSearchParams(next, { replace: true });
    }
  }, [onHydrateFromParams, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (!selectedCharacter) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-gray-300">
        <div>
          <p className="text-lg font-semibold text-amber-200">Choose a mentor to begin your conversation.</p>
          <p className="text-sm text-gray-400 mt-2">Return to the ancient selector to pick a guide.</p>
        </div>
      </div>
    );
  }

  return (
    <ConversationView
      character={selectedCharacter}
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
