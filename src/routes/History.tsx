import React from 'react';
import { useNavigate } from 'react-router-dom';
import HistoryView from '@/components/HistoryView';
import type { SavedConversation } from '@/types';

type HistoryRouteProps = {
  history: SavedConversation[];
  onResumeConversation: (conversation: SavedConversation) => void;
  onCreateQuestFromNextSteps: (steps: string[], questTitle?: string) => void;
  onDeleteConversation: (id: string) => void;
};

const HistoryRoute: React.FC<HistoryRouteProps> = ({
  history,
  onResumeConversation,
  onCreateQuestFromNextSteps,
  onDeleteConversation,
}) => {
  const navigate = useNavigate();

  return (
    <HistoryView
      onBack={() => navigate('/')}
      onResumeConversation={onResumeConversation}
      onCreateQuestFromNextSteps={onCreateQuestFromNextSteps}
      history={history}
      onDeleteConversation={onDeleteConversation}
    />
  );
};

export default HistoryRoute;
