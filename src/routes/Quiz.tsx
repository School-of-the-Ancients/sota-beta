import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import QuestQuiz from '../../components/QuestQuiz';
import type { Quest, QuestAssessment, QuizResult } from '../../types';

interface QuizRouteProps {
  quests: Quest[];
  pendingAssessment: { questId: string; assessment: QuestAssessment | null } | null;
  onExit: () => void;
  onComplete: (result: QuizResult) => void;
}

const QuizRoute: React.FC<QuizRouteProps> = ({ quests, pendingAssessment, onExit, onComplete }) => {
  const navigate = useNavigate();
  const { questId } = useParams<{ questId: string }>();

  const quest = useMemo(() => quests.find((item) => item.id === questId) ?? null, [questId, quests]);
  const assessment = quest && pendingAssessment?.questId === quest.id ? pendingAssessment.assessment ?? undefined : undefined;

  useEffect(() => {
    if (!quest && questId) {
      navigate('/quests', { replace: true });
    }
  }, [navigate, quest, questId]);

  if (!quest) {
    return (
      <div className="text-center text-gray-300">
        <p className="text-lg">Quiz unavailable. Returning to the quest library…</p>
      </div>
    );
  }

  return <QuestQuiz quest={quest} assessment={assessment} onExit={onExit} onComplete={onComplete} />;
};

export default QuizRoute;
