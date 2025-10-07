import React from 'react';

import HistoryView from '../../components/HistoryView';
import type { SavedConversation } from '../../types';

interface HistoryRouteProps {
  history: SavedConversation[];
  onResumeConversation: (conversation: SavedConversation) => void;
  onCreateQuestFromNextSteps: (steps: string[], questTitle?: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onBack: () => void;
}

const HistoryRoute: React.FC<HistoryRouteProps> = ({
  history,
  onResumeConversation,
  onCreateQuestFromNextSteps,
  onDeleteConversation,
  onBack,
}) => {
  return (
    <HistoryView
      onBack={onBack}
      onResumeConversation={onResumeConversation}
      onCreateQuestFromNextSteps={onCreateQuestFromNextSteps}
      history={history}
      onDeleteConversation={onDeleteConversation}
    />
  );
};

export default HistoryRoute;
