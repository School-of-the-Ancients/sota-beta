import React from 'react';
import type { Character, Quest } from '../../types';
import QuestsView from '../../components/QuestsView';
import { useTitle } from '../hooks/useTitle';

interface QuestsRouteProps {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  inProgressQuestIds: string[];
  deletableQuestIds: string[];
  onSelectQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
  onCreateQuest: () => void;
  onBack: () => void;
}

const QuestsRoute: React.FC<QuestsRouteProps> = ({
  quests,
  characters,
  completedQuestIds,
  inProgressQuestIds,
  deletableQuestIds,
  onSelectQuest,
  onDeleteQuest,
  onCreateQuest,
  onBack,
}) => {
  useTitle('Learning Quests • School of the Ancients');

  return (
    <QuestsView
      quests={quests}
      characters={characters}
      completedQuestIds={completedQuestIds}
      onSelectQuest={onSelectQuest}
      onBack={onBack}
      onCreateQuest={onCreateQuest}
      inProgressQuestIds={inProgressQuestIds}
      onDeleteQuest={onDeleteQuest}
      deletableQuestIds={deletableQuestIds}
    />
  );
};

export default QuestsRoute;
