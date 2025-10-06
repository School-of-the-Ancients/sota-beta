import React from 'react';
import { useNavigate } from 'react-router-dom';

import HistoryView from '../components/HistoryView';
import links from '../lib/links';
import { useAppState } from '../state/AppStateContext';
import type { SavedConversation } from '../types';

const HistoryRoute: React.FC = () => {
  const navigate = useNavigate();
  const { resumeConversation, handleCreateQuestFromNextSteps } = useAppState();

  const handleResumeConversation = (conversation: SavedConversation) => {
    resumeConversation(conversation);
    navigate(links.conversation(conversation.characterId, { resumeId: conversation.id }));
  };

  const handleCreateQuest = (steps: string[], questTitle?: string) => {
    handleCreateQuestFromNextSteps(steps, questTitle);
    navigate('/quest/new');
  };

  return (
    <HistoryView
      onBack={() => navigate('/')}
      onResumeConversation={handleResumeConversation}
      onCreateQuestFromNextSteps={handleCreateQuest}
    />
  );
};

export default HistoryRoute;
