import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ConversationView from '../../components/ConversationView';
import type { ConversationTurn } from '../../types';
import { links } from '../lib/links';
import { parseConversationParams } from '../lib/url';
import { loadConversationById } from '../lib/storage';
import { useAppState } from '../state/AppStateContext';

const ConversationRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { characterId, resumeId } = React.useMemo(() => parseConversationParams(location.search), [location.search]);
  const {
    characters,
    selectedCharacter,
    beginConversationWithCharacter,
    resumeConversation,
    environmentImageUrl,
    setEnvironmentImageUrl,
    activeQuest,
    isSaving,
    resumeConversationId,
    setResumeConversationId,
    finalizeConversation,
  } = useAppState();

  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    if (!characterId) {
      setResumeConversationId(null);
      return;
    }

    const character = characters.find((c) => c.id === characterId);
    if (!character) {
      return;
    }

    if (resumeId) {
      const conversation = loadConversationById(resumeId);
      if (conversation) {
        resumeConversation(conversation);
        initializedRef.current = true;
        return;
      }
    }

    if (!initializedRef.current || !selectedCharacter || selectedCharacter.id !== character.id) {
      beginConversationWithCharacter(character);
      setResumeConversationId(null);
      initializedRef.current = true;
    }
  }, [
    characterId,
    resumeId,
    characters,
    beginConversationWithCharacter,
    resumeConversation,
    selectedCharacter,
    setResumeConversationId,
  ]);

  if (!characterId) {
    return <Navigate to={links.home()} replace />;
  }

  if (!selectedCharacter || selectedCharacter.id !== characterId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 items-center justify-center text-center text-gray-300">
        <p className="text-lg">Preparing your mentor…</p>
      </div>
    );
  }

  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    const result = await finalizeConversation(transcript, sessionId);
    if (result.next === 'quiz' && result.questId) {
      navigate(links.quiz(result.questId));
    } else {
      navigate(links.home());
    }
  };

  return (
    <ConversationView
      character={selectedCharacter}
      onEndConversation={handleEndConversation}
      environmentImageUrl={environmentImageUrl}
      onEnvironmentUpdate={setEnvironmentImageUrl}
      activeQuest={activeQuest}
      isSaving={isSaving}
      resumeConversationId={resumeConversationId}
    />
  );
};

export default ConversationRoute;
