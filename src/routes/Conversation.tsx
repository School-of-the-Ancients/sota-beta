import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import ConversationView from '../components/ConversationView';
import links from '../lib/links';
import { parseConversationSearch } from '../lib/url';
import { findConversationById } from '../lib/storage';
import { useAppState } from '../state/AppStateContext';
import type { ConversationTurn } from '../types';

const ConversationRoute: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { characterSlug, resumeId } = useMemo(
    () => parseConversationSearch(searchParams.toString()),
    [searchParams],
  );
  const {
    characters,
    selectedCharacter,
    selectCharacter,
    resumeConversation,
    environmentImageUrl,
    setEnvironmentImageUrl,
    activeQuest,
    isSaving,
    resumeConversationId,
    finalizeConversation,
  } = useAppState();

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!characterSlug) {
      navigate('/', { replace: true });
      return;
    }

    const character = characters.find((item) => item.id === characterSlug);
    if (!character) {
      return;
    }

    if (hydrated) {
      return;
    }

    if (resumeId) {
      const conversation = findConversationById(resumeId);
      if (conversation) {
        resumeConversation(conversation);
      } else {
        selectCharacter(character);
      }
    } else {
      selectCharacter(character);
    }

    setHydrated(true);
  }, [characterSlug, resumeId, characters, resumeConversation, selectCharacter, navigate, hydrated]);

  if (!characterSlug) {
    return <Navigate to="/" replace />;
  }

  if (!selectedCharacter || selectedCharacter.id !== characterSlug) {
    if (!hydrated) {
      return (
        <div className="flex flex-1 items-center justify-center text-gray-300 text-lg">
          Preparing your conversation…
        </div>
      );
    }
    return (
      <div className="flex flex-1 items-center justify-center text-gray-300 text-lg">
        Mentor unavailable. <button type="button" onClick={() => navigate('/')} className="ml-2 underline text-amber-300">Choose another.</button>
      </div>
    );
  }

  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    const result = await finalizeConversation(transcript, sessionId);
    if (result.next === 'quiz' && result.questId) {
      navigate(links.quiz(result.questId));
    } else {
      navigate('/');
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
