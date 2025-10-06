import React from 'react';
import HistoryView from '../../components/HistoryView';
import type { SavedConversation } from '../../types';
import { links } from '../lib/links';
import { useAppState } from '../state/AppStateContext';
import { useNavigate } from 'react-router-dom';

const HistoryRoute: React.FC = () => {
  const navigate = useNavigate();
  const { resumeConversation, prefillQuestFromNextSteps } = useAppState();

  const handleBack = () => {
    navigate(links.home());
  };

  const handleResumeConversation = (conversation: SavedConversation) => {
    const character = resumeConversation(conversation);
    if (!character) {
      return;
    }
    navigate(links.conversation(character.id, { resumeId: conversation.id }));
  };

  const handleCreateQuestFromNextSteps = (improvements: string[], questTitle?: string) => {
    prefillQuestFromNextSteps(improvements, questTitle);
    navigate(links.questCreator());
  };

  return (
    <HistoryView
      onBack={handleBack}
      onResumeConversation={handleResumeConversation}
      onCreateQuestFromNextSteps={handleCreateQuestFromNextSteps}
    />
  );
};

export default HistoryRoute;
