import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import QuestQuiz from '../../components/QuestQuiz';
import type { QuizResult } from '../../types';
import { links } from '../lib/links';
import { useAppState } from '../state/AppStateContext';

const QuizRoute: React.FC = () => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();
  const {
    quests,
    pendingQuizAssessment,
    lastQuestOutcome,
    completeQuiz,
    exitQuiz,
  } = useAppState();

  const quest = React.useMemo(() => quests.find((q) => q.id === questId) ?? null, [quests, questId]);

  if (!quest) {
    return <Navigate to={links.quests()} replace />;
  }

  const assessment = React.useMemo(() => {
    if (pendingQuizAssessment && pendingQuizAssessment.questId === quest.id) {
      return pendingQuizAssessment;
    }
    if (lastQuestOutcome && lastQuestOutcome.questId === quest.id) {
      return lastQuestOutcome;
    }
    return null;
  }, [lastQuestOutcome, pendingQuizAssessment, quest.id]);

  const handleExit = () => {
    exitQuiz();
    navigate(links.home());
  };

  const handleComplete = (result: QuizResult) => {
    completeQuiz(result);
    navigate(links.home());
  };

  return <QuestQuiz quest={quest} assessment={assessment} onExit={handleExit} onComplete={handleComplete} />;
};

export default QuizRoute;
