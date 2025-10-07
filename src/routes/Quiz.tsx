import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Quest, QuestAssessment, QuizResult } from '../../types';
import QuestQuiz from '../../components/QuestQuiz';

interface QuizRouteProps {
  quests: Quest[];
  assessment: QuestAssessment | null;
  onExit: () => void;
  onComplete: (quest: Quest, result: QuizResult) => void;
  apiKey: string | null;
}

const QuizRoute: React.FC<QuizRouteProps> = ({ quests, assessment, onExit, onComplete, apiKey }) => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();

  const quest = useMemo(() => quests.find((item) => item.id === questId) ?? null, [quests, questId]);

  useEffect(() => {
    if (!quest) {
      navigate('/quests', { replace: true });
    }
  }, [navigate, quest]);

  if (!quest) {
    return (
      <div className="text-center text-gray-300">
        <p className="text-lg">Quiz unavailable. Redirecting…</p>
      </div>
    );
  }

  return (
    <QuestQuiz
      quest={quest}
      assessment={assessment && assessment.questId === quest.id ? assessment : null}
      onExit={onExit}
      onComplete={(result) => onComplete(quest, result)}
      apiKey={apiKey}
    />
  );
};

export default QuizRoute;
