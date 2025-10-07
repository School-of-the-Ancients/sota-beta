import React from 'react';
import type { SavedConversation } from '../../types';
import HistoryView from '../../components/HistoryView';

interface HistoryRouteProps {
  history: SavedConversation[];
  onBack: () => void;
  onResumeConversation: (conversation: SavedConversation) => void;
  onCreateQuestFromNextSteps: (steps: string[], questTitle?: string) => void;
  onDeleteConversation: (id: string) => void;
}

const HistoryRoute: React.FC<HistoryRouteProps> = ({
  history,
  onBack,
  onResumeConversation,
  onCreateQuestFromNextSteps,
  onDeleteConversation,
}) => {
  return (
    <HistoryView
      history={history}
      onBack={onBack}
      onResumeConversation={onResumeConversation}
      onCreateQuestFromNextSteps={onCreateQuestFromNextSteps}
      onDeleteConversation={onDeleteConversation}
    />
  );
};

export default HistoryRoute;
