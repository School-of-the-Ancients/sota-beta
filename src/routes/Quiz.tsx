import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Quest, QuestAssessment, QuizResult } from '../../types';
import QuestQuiz from '../../components/QuestQuiz';
import { useTitle } from '../hooks/useTitle';

interface QuizRouteProps {
  quests: Quest[];
  lastQuestOutcome: QuestAssessment | null;
  onExit: () => void;
  onComplete: (quest: Quest, result: QuizResult) => void;
}

const QuizRoute: React.FC<QuizRouteProps> = ({ quests, lastQuestOutcome, onExit, onComplete }) => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();

  const quest = useMemo(() => quests.find((item) => item.id === questId), [quests, questId]);
  const assessment = quest && lastQuestOutcome?.questId === quest.id ? lastQuestOutcome : null;

  useTitle(quest ? `Quiz: ${quest.title} • School of the Ancients` : 'Quiz • School of the Ancients');

  useEffect(() => {
    if (!quest) {
      navigate('/quests', { replace: true });
    }
  }, [navigate, quest]);

  if (!quest) {
    return null;
  }

  return <QuestQuiz quest={quest} assessment={assessment} onExit={onExit} onComplete={(result) => onComplete(quest, result)} />;
};

export default QuizRoute;
