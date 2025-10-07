import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Character, Quest } from '@/types';

type QuestDetailRouteProps = {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  onStartQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
  deletableQuestIds: string[];
};

const QuestDetail: React.FC<QuestDetailRouteProps> = ({
  quests,
  characters,
  completedQuestIds,
  onStartQuest,
  onDeleteQuest,
  deletableQuestIds,
}) => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();

  const quest = quests.find((item) => item.id === questId);
  const mentor = quest ? characters.find((character) => character.id === quest.characterId) ?? null : null;
  const isCompleted = quest ? completedQuestIds.includes(quest.id) : false;
  const isDeletable = quest ? deletableQuestIds.includes(quest.id) : false;

  useEffect(() => {
    if (!quest || !mentor) {
      navigate('/quests', { replace: true });
    }
  }, [mentor, navigate, quest]);

  if (!quest || !mentor) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm font-semibold text-amber-200 hover:text-amber-100"
      >
        ← Back to quests
      </button>

      <div className="bg-gray-900/70 border border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <img
            src={mentor.portraitUrl}
            alt={mentor.name}
            className="w-32 h-32 rounded-full border-2 border-amber-400 object-cover"
          />
          <div className="text-left">
            <p className="text-xs uppercase tracking-wide text-amber-200">Guided by</p>
            <h1 className="text-3xl font-bold text-amber-100">{mentor.name}</h1>
            <p className="text-sm text-gray-400 italic">{mentor.title}</p>
          </div>
        </div>

        <div className="space-y-4 text-left">
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-200">Quest title</p>
            <h2 className="text-2xl font-bold text-amber-100 mt-1">{quest.title}</h2>
          </div>
          <p className="text-gray-200 text-lg leading-relaxed">{quest.description}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wide text-amber-200 mb-2">Objective</p>
              <p className="text-sm text-gray-200 leading-relaxed">{quest.objective}</p>
            </div>
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wide text-amber-200 mb-2">Duration</p>
              <p className="text-sm text-gray-200 leading-relaxed">{quest.duration}</p>
            </div>
          </div>

          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-left">
            <p className="text-xs uppercase tracking-wide text-amber-200 mb-2">Focus points</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-200">
              {quest.focusPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onStartQuest(quest)}
            className={`px-5 py-2 rounded-lg font-semibold transition-colors ${
              isCompleted ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-amber-600 hover:bg-amber-500 text-black'
            }`}
          >
            {isCompleted ? 'Review quest with mentor' : 'Begin quest'}
          </button>
          {isDeletable && (
            <button
              type="button"
              onClick={() => onDeleteQuest(quest.id)}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-500/70 text-red-200 hover:bg-red-900/30"
            >
              Delete quest
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestDetail;
