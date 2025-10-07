import React from 'react';

import QuestCreator from '../../components/QuestCreator';
import type { Character, Quest } from '../../types';

interface QuestCreatorRouteProps {
  characters: Character[];
  initialGoal?: string | null;
  onBack: () => void;
  onQuestReady: (quest: Quest, mentor: Character) => void;
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
