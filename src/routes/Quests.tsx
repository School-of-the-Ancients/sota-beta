import React from 'react';

import QuestsView from '../../components/QuestsView';
import type { Character, Quest } from '../../types';

interface QuestsRouteProps {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  inProgressQuestIds: string[];
  deletableQuestIds: string[];
  onSelectQuest: (quest: Quest) => void;
  onCreateQuest: () => void;
  onBack: () => void;
  onDeleteQuest: (questId: string) => void;
}

const QuestsRoute: React.FC<QuestsRouteProps> = ({
  quests,
  characters,
  completedQuestIds,
  inProgressQuestIds,
  deletableQuestIds,
  onSelectQuest,
  onCreateQuest,
  onBack,
  onDeleteQuest,
}) => {
  return (
    <QuestsView
      quests={quests}
      characters={characters}
      completedQuestIds={completedQuestIds}
      onSelectQuest={onSelectQuest}
      onCreateQuest={onCreateQuest}
      onBack={onBack}
      inProgressQuestIds={inProgressQuestIds}
      onDeleteQuest={onDeleteQuest}
      deletableQuestIds={deletableQuestIds}
    />
  );
};

export default QuestsRoute;
