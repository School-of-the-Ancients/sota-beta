import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Character, Quest } from '../../types';
import QuestIcon from '../../components/icons/QuestIcon';

interface QuestDetailRouteProps {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  inProgressQuestIds: string[];
  deletableQuestIds: string[];
  onStartQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
  onBack: () => void;
}

const QuestDetailRoute: React.FC<QuestDetailRouteProps> = ({
  quests,
  characters,
  completedQuestIds,
  inProgressQuestIds,
  deletableQuestIds,
  onStartQuest,
  onDeleteQuest,
  onBack,
}) => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();

  const quest = useMemo(() => quests.find((item) => item.id === questId), [quests, questId]);
  const character = useMemo(
    () => (quest ? characters.find((item) => item.id === quest.characterId) ?? null : null),
    [characters, quest]
  );

  useEffect(() => {
    if (!questId) {
      navigate('/quests', { replace: true });
      return;
    }
    if (!quest || !character) {
      navigate('/quests', { replace: true });
    }
  }, [character, navigate, quest, questId]);

  if (!quest || !character) {
    return null;
  }

  const isCompleted = completedQuestIds.includes(quest.id);
  const isInProgress = inProgressQuestIds.includes(quest.id);
  const isDeletable = deletableQuestIds.includes(quest.id);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <QuestIcon className="w-8 h-8 text-amber-300" />
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-400">Quest Detail</p>
            <h2 className="text-3xl font-bold text-amber-200">{quest.title}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Back to quests
        </button>
      </div>

      <div className="bg-gray-900/60 border border-gray-700 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <img
            src={character.portraitUrl}
            alt={character.name}
            className="w-28 h-28 rounded-full border-2 border-amber-300 object-cover"
          />
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-400">Mentor</p>
            <h3 className="text-2xl font-bold text-amber-200">{character.name}</h3>
            <p className="text-sm text-gray-400">{character.title}</p>
            <p className="text-sm text-gray-400 mt-2">
              Duration: <span className="text-amber-200 font-semibold">{quest.duration}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            {isCompleted && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/30 text-emerald-200 text-xs font-semibold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-300" />
                Completed
              </span>
            )}
            {!isCompleted && isInProgress && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-700/30 text-teal-200 text-xs font-semibold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-teal-300" />
                In progress
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 text-left text-gray-200">
          <section>
            <h4 className="text-sm uppercase tracking-wide text-amber-200 mb-2">Overview</h4>
            <p className="text-base leading-relaxed text-gray-300">{quest.description}</p>
          </section>
          <section>
            <h4 className="text-sm uppercase tracking-wide text-amber-200 mb-2">Objective</h4>
            <p className="text-base leading-relaxed text-gray-200">{quest.objective}</p>
          </section>
          <section>
            <h4 className="text-sm uppercase tracking-wide text-amber-200 mb-2">Focus Points</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
              {quest.focusPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onStartQuest(quest)}
              className={`font-bold py-2 px-4 rounded-lg transition-colors ${
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
                className="font-bold py-2 px-4 rounded-lg border border-red-500/70 text-red-200 hover:bg-red-900/30"
              >
                Delete quest
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestDetailRoute;
