import React from 'react';
import { useNavigate } from 'react-router-dom';
import QuestsView from '../../components/QuestsView';
import type { Quest } from '../../types';
import { links } from '../lib/links';
import { useAppState } from '../state/AppStateContext';

const Quests: React.FC = () => {
  const navigate = useNavigate();
  const {
    quests,
    characters,
    completedQuests,
    inProgressQuestIds,
    deleteQuest,
    customQuests,
    setQuestCreatorPrefill,
  } = useAppState();

  const handleSelectQuest = (quest: Quest) => {
    navigate(links.quest(quest.id));
  };

  const handleBack = () => {
    navigate(links.home());
  };

  const handleCreateQuest = () => {
    setQuestCreatorPrefill(null);
    navigate(links.questCreator());
  };

  return (
    <QuestsView
      quests={quests}
      characters={characters}
      completedQuestIds={completedQuests}
      onSelectQuest={handleSelectQuest}
      onBack={handleBack}
      onCreateQuest={handleCreateQuest}
      inProgressQuestIds={inProgressQuestIds}
      onDeleteQuest={deleteQuest}
      deletableQuestIds={customQuests.map((quest) => quest.id)}
    />
  );
};

export default Quests;
