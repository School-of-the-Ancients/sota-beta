import React from 'react';
import { useNavigate } from 'react-router-dom';

import QuestCreator from '../components/QuestCreator';
import links from '../lib/links';
import { useAppState } from '../state/AppStateContext';

const QuestCreatorRoute: React.FC = () => {
  const navigate = useNavigate();
  const { characters, addCustomCharacter, startGeneratedQuest, questCreatorPrefill } = useAppState();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleQuestReady = (
    quest: Parameters<typeof startGeneratedQuest>[0],
    character: Parameters<typeof startGeneratedQuest>[1],
  ) => {
    startGeneratedQuest(quest, character);
    navigate(links.conversation(character.id));
  };

  const handleCharacterCreated = (character: Parameters<typeof addCustomCharacter>[0]) => {
    addCustomCharacter(character);
  };

  return (
    <QuestCreator
      characters={characters}
      onBack={handleBack}
      onQuestReady={handleQuestReady}
      onCharacterCreated={handleCharacterCreated}
      initialGoal={questCreatorPrefill ?? undefined}
    />
  );
};

export default QuestCreatorRoute;
