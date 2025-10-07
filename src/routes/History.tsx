import React from 'react';
import HistoryView from '../../components/HistoryView';
import type { SavedConversation } from '../../types';
import { useTitle } from '../hooks/useTitle';

interface HistoryRouteProps {
  history: SavedConversation[];
  onBack: () => void;
  onResumeConversation: (conversation: SavedConversation) => void;
  onCreateQuestFromNextSteps: (steps: string[], questTitle?: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

const HistoryRoute: React.FC<HistoryRouteProps> = ({
  history,
  onBack,
  onResumeConversation,
  onCreateQuestFromNextSteps,
  onDeleteConversation,
}) => {
  useTitle('Conversation History • School of the Ancients');

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
