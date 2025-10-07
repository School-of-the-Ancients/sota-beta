import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import QuestIcon from '../../components/icons/QuestIcon';
import type { Character, Quest } from '../../types';

interface QuestDetailRouteProps {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  inProgressQuestIds: string[];
  deletableQuestIds: string[];
  onSelectQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
}

const QuestDetailRoute: React.FC<QuestDetailRouteProps> = ({
  quests,
  characters,
  completedQuestIds,
  inProgressQuestIds,
  deletableQuestIds,
  onSelectQuest,
  onDeleteQuest,
}) => {
  const navigate = useNavigate();
  const { questId } = useParams<{ questId: string }>();

  const quest = useMemo(() => quests.find((item) => item.id === questId), [quests, questId]);
  const character = useMemo(
    () => (quest ? characters.find((item) => item.id === quest.characterId) ?? null : null),
    [characters, quest],
  );

  useEffect(() => {
    if (!quest || !character) {
      navigate('/quests', { replace: true });
    }
  }, [character, navigate, quest]);

  if (!quest || !character) {
    return null;
  }

  const isCompleted = completedQuestIds.includes(quest.id);
  const isInProgress = inProgressQuestIds.includes(quest.id);
  const isDeletable = deletableQuestIds.includes(quest.id);

  const handleStartQuest = () => {
    onSelectQuest(quest);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/quests')}
        className="mb-6 inline-flex items-center text-sm font-semibold text-amber-200 hover:text-amber-100 hover:underline"
      >
        ← Back to quests
      </button>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8">
          <img
            src={character.portraitUrl}
            alt={character.name}
            className="w-32 h-32 rounded-full border-2 border-amber-300 object-cover"
          />

          <div className="flex-1 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <QuestIcon className="w-8 h-8 text-amber-300" />
              <h2 className="text-3xl font-bold text-amber-200">{quest.title}</h2>
            </div>
            <p className="text-sm text-gray-400 uppercase tracking-wide">Guided by {character.name}</p>
            <p className="text-gray-200 text-lg leading-relaxed">{quest.description}</p>

            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold uppercase tracking-wide">
                {quest.duration}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-600/30 text-emerald-100 text-xs font-semibold uppercase tracking-wide">
                  Completed
                </span>
              )}
              {!isCompleted && isInProgress && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-600/30 text-teal-100 text-xs font-semibold uppercase tracking-wide">
                  In Progress
                </span>
              )}
            </div>

            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-200 mb-1">Objective</p>
                <p className="text-sm text-gray-200 leading-relaxed">{quest.objective}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-200 mb-1">Focus Points</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-200">
                  {quest.focusPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleStartQuest}
                className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-colors ${
                  isCompleted
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-black'
                    : isInProgress
                      ? 'bg-teal-600 hover:bg-teal-500 text-black'
                      : 'bg-amber-600 hover:bg-amber-500 text-black'
                }`}
              >
                {isCompleted ? 'Review quest' : isInProgress ? 'Continue quest' : 'Begin quest'}
              </button>

              {isDeletable && (
                <button
                  type="button"
                  onClick={() => onDeleteQuest(quest.id)}
                  className="px-6 py-3 rounded-lg border border-red-600/70 text-red-200 hover:bg-red-900/40 transition-colors"
                >
                  Delete quest
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestDetailRoute;
