import React from 'react';
import type { Character, Quest } from '../../types';
import QuestCreator from '../../components/QuestCreator';

interface QuestCreatorRouteProps {
  characters: Character[];
  initialGoal?: string | null;
  onBack: () => void;
  onQuestReady: (quest: Quest, character: Character) => void;
  onCharacterCreated: (character: Character) => void;
}

const QuestCreatorRoute: React.FC<QuestCreatorRouteProps> = ({
  characters,
  initialGoal,
  onBack,
  onQuestReady,
  onCharacterCreated,
}) => {
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
