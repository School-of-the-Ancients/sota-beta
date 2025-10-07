import React from 'react';
import { useNavigate } from 'react-router-dom';
import QuestsView from '@/components/QuestsView';
import type { Character, Quest } from '@/types';

type QuestsRouteProps = {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  inProgressQuestIds: string[];
  deletableQuestIds: string[];
  onSelectQuest: (quest: Quest) => void;
  onCreateQuest: () => void;
  onDeleteQuest: (questId: string) => void;
};

const Quests: React.FC<QuestsRouteProps> = ({
  quests,
  characters,
  completedQuestIds,
  inProgressQuestIds,
  deletableQuestIds,
  onSelectQuest,
  onCreateQuest,
  onDeleteQuest,
}) => {
  const navigate = useNavigate();

  return (
    <QuestsView
      quests={quests}
      characters={characters}
      completedQuestIds={completedQuestIds}
      onSelectQuest={onSelectQuest}
      onBack={() => navigate('/')}
      onCreateQuest={onCreateQuest}
      inProgressQuestIds={inProgressQuestIds}
      onDeleteQuest={onDeleteQuest}
      deletableQuestIds={deletableQuestIds}
    />
  );
};

export default Quests;
