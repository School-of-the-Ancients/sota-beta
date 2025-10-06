import React, { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import QuestQuiz from '../components/QuestQuiz';
import { useAppState } from '../state/AppStateContext';

const QuizRoute: React.FC = () => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();
  const {
    quests,
    pendingQuizQuest,
    pendingQuizAssessment,
    handleQuizComplete,
    handleQuizExit,
  } = useAppState();

  const quest = useMemo(() => quests.find((item) => item.id === questId), [quests, questId]);

  if (!quest) {
    return <Navigate to="/quests" replace />;
  }

  const assessment = pendingQuizQuest?.id === quest.id ? pendingQuizAssessment : null;

  return (
    <QuestQuiz
      quest={quest}
      assessment={assessment}
      onExit={() => {
        handleQuizExit();
        navigate('/');
      }}
      onComplete={(result) => {
        handleQuizComplete(result);
        navigate('/');
      }}
    />
  );
};

export default QuizRoute;
