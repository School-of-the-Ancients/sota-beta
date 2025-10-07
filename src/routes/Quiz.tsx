import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuestQuiz from '@/components/QuestQuiz';
import type { Quest, QuestAssessment, QuizResult } from '@/types';

type QuizRouteProps = {
  quests: Quest[];
  pendingQuest: Quest | null;
  pendingAssessment: QuestAssessment | null;
  onMissingQuest: () => void;
  onExit: () => void;
  onComplete: (result: QuizResult) => void;
};

const QuizRoute: React.FC<QuizRouteProps> = ({
  quests,
  pendingQuest,
  pendingAssessment,
  onMissingQuest,
  onExit,
  onComplete,
}) => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();

  const quest = useMemo(() => {
    if (!questId) {
      return null;
    }
    if (pendingQuest && pendingQuest.id === questId) {
      return pendingQuest;
    }
    return quests.find((item) => item.id === questId) ?? null;
  }, [pendingQuest, questId, quests]);

  useEffect(() => {
    if (!questId) {
      onMissingQuest();
      navigate('/quests', { replace: true });
      return;
    }
    if (!quest) {
      onMissingQuest();
      navigate('/quests', { replace: true });
    }
  }, [navigate, onMissingQuest, quest, questId]);

  if (!quest) {
    return null;
  }

  const assessment = pendingAssessment?.questId === quest.id ? pendingAssessment : null;

  return <QuestQuiz quest={quest} assessment={assessment} onExit={onExit} onComplete={onComplete} />;
};

export default QuizRoute;
