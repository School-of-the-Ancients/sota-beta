import React from 'react';
import { useNavigate } from 'react-router-dom';

import QuestsView from '../components/QuestsView';
import links from '../lib/links';
import { useAppState } from '../state/AppStateContext';

const Quests: React.FC = () => {
  const navigate = useNavigate();
  const {
    quests,
    characters,
    completedQuestIds,
    inProgressQuestIds,
    customQuests,
    selectQuest,
    deleteQuest,
    setQuestCreatorPrefill,
  } = useAppState();

  const handleSelectQuest = (questId: string) => {
    const quest = quests.find((item) => item.id === questId);
    if (!quest) return;
    selectQuest(quest);
    navigate(links.conversation(quest.characterId));
  };

  const handleCreateQuest = () => {
    setQuestCreatorPrefill(null);
    navigate('/quest/new');
  };

  return (
    <QuestsView
      quests={quests}
      characters={characters}
      completedQuestIds={completedQuestIds}
      onSelectQuest={handleSelectQuest}
      onBack={() => navigate('/')}
      onCreateQuest={handleCreateQuest}
      inProgressQuestIds={inProgressQuestIds}
      onDeleteQuest={deleteQuest}
      deletableQuestIds={customQuests.map((quest) => quest.id)}
    />
  );
};

export default Quests;
