import React from 'react';
import { useNavigate } from 'react-router-dom';
import QuestCreator from '../../components/QuestCreator';
import type { Character, Quest } from '../../types';
import { links } from '../lib/links';
import { useAppState } from '../state/AppStateContext';

const QuestCreatorRoute: React.FC = () => {
  const navigate = useNavigate();
  const {
    characters,
    questCreatorPrefill,
    setQuestCreatorPrefill,
    startGeneratedQuest,
    addCustomCharacter,
  } = useAppState();

  const handleBack = () => {
    setQuestCreatorPrefill(null);
    navigate(links.home());
  };

  const handleQuestReady = (quest: Quest, mentor: Character) => {
    startGeneratedQuest(quest, mentor);
    navigate(links.conversation(mentor.id));
  };

  const handleCharacterCreated = (character: Character) => {
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
