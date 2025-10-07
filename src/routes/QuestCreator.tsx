import React from 'react';
import type { Character, Quest } from '../../types';
import QuestCreator from '../../components/QuestCreator';
import { useTitle } from '../hooks/useTitle';

interface QuestCreatorRouteProps {
  characters: Character[];
  onBack: () => void;
  onQuestReady: (quest: Quest, character: Character) => void;
  onCharacterCreated: (character: Character) => void;
  initialGoal?: string | null;
}

const QuestCreatorRoute: React.FC<QuestCreatorRouteProps> = ({
  characters,
  onBack,
  onQuestReady,
  onCharacterCreated,
  initialGoal,
}) => {
  useTitle('Create a Quest • School of the Ancients');

  return (
    <QuestCreator
      characters={characters}
      onBack={onBack}
      onQuestReady={onQuestReady}
      onCharacterCreated={onCharacterCreated}
      initialGoal={initialGoal ?? undefined}
    />
  );
};

export default QuestCreatorRoute;
