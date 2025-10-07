import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Character, Quest } from '../../types';
import { useTitle } from '../hooks/useTitle';

interface QuestDetailRouteProps {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  inProgressQuestIds: string[];
  onSelectQuest: (quest: Quest) => void;
  onBack: () => void;
}

const QuestDetailRoute: React.FC<QuestDetailRouteProps> = ({
  quests,
  characters,
  completedQuestIds,
  inProgressQuestIds,
  onSelectQuest,
  onBack,
}) => {
  const navigate = useNavigate();
  const { questId } = useParams<{ questId: string }>();

  const quest = useMemo(() => quests.find((item) => item.id === questId), [quests, questId]);
  const character = useMemo(
    () => (quest ? characters.find((item) => item.id === quest.characterId) ?? null : null),
    [characters, quest]
  );

  useTitle(quest ? `${quest.title} • School of the Ancients` : 'Quest • School of the Ancients');

  useEffect(() => {
    if (!quest) {
      navigate('/quests', { replace: true });
    }
  }, [navigate, quest]);

  if (!quest || !character) {
    return null;
  }

  const isCompleted = completedQuestIds.includes(quest.id);
  const isInProgress = inProgressQuestIds.includes(quest.id);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-200 hover:text-amber-100"
      >
        ← Back to quests
      </button>

      <div className="bg-gray-900/70 border border-amber-500/40 rounded-2xl p-8 shadow-lg shadow-amber-900/30">
        <div className="flex flex-col md:flex-row gap-6">
          <img
            src={character.portraitUrl}
            alt={character.name}
            className="w-40 h-40 rounded-2xl object-cover border-2 border-amber-300 shadow-lg"
          />
          <div className="flex-1">
            <p className="text-sm uppercase tracking-wide text-amber-200">Guided by {character.name}</p>
            <h1 className="text-3xl font-bold text-amber-100 mt-2">{quest.title}</h1>
            <p className="text-gray-300 mt-3 leading-relaxed">{quest.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-100 font-semibold uppercase tracking-wide">
                {quest.duration}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-700/40 text-emerald-100 text-xs font-semibold uppercase tracking-wide">
                  Completed
                </span>
              )}
              {!isCompleted && isInProgress && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-700/40 text-teal-100 text-xs font-semibold uppercase tracking-wide">
                  In Progress
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <p className="text-xs uppercase tracking-wide text-amber-200 mb-2">Objective</p>
            <p className="text-gray-200 leading-relaxed">{quest.objective}</p>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
            <p className="text-xs uppercase tracking-wide text-amber-200 mb-2">Mentor Expertise</p>
            <p className="text-gray-200 leading-relaxed">{character.expertise}</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-wide text-amber-200 mb-3">Focus Points</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {quest.focusPoints.map((point) => (
              <li key={point} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-200">
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => onSelectQuest(quest)}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isCompleted ? 'Review conversation' : isInProgress ? 'Continue quest' : 'Begin quest'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex-1 border border-gray-700 hover:border-amber-500/60 text-amber-200 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Browse other quests
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestDetailRoute;
