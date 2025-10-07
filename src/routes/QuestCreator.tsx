import React from 'react';
import QuestCreator from '@/components/QuestCreator';
import type { Character, Quest } from '@/types';

type QuestCreatorRouteProps = {
  characters: Character[];
  initialGoal?: string | null;
  onQuestReady: (quest: Quest, character: Character) => void;
  onCharacterCreated: (character: Character) => void;
  onBack: () => void;
};

const QuestCreatorRoute: React.FC<QuestCreatorRouteProps> = ({
  characters,
  initialGoal,
  onQuestReady,
  onCharacterCreated,
  onBack,
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
