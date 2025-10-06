import React, { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import QuestIcon from '../components/icons/QuestIcon';
import links from '../lib/links';
import { useAppState } from '../state/AppStateContext';
import type { Character } from '../types';

const QuestDetail: React.FC = () => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();
  const {
    quests,
    characters,
    selectQuest,
    completedQuestIds,
    inProgressQuestIds,
    launchQuizForQuest,
  } = useAppState();

  const quest = useMemo(() => quests.find((item) => item.id === questId), [quests, questId]);

  if (!quest) {
    return <Navigate to="/quests" replace />;
  }

  const character: Character | undefined = characters.find((item) => item.id === quest.characterId);
  const isCompleted = completedQuestIds.includes(quest.id);
  const isInProgress = inProgressQuestIds.includes(quest.id);

  const beginQuest = () => {
    selectQuest(quest);
    navigate(links.conversation(quest.characterId));
  };

  const startQuiz = () => {
    launchQuizForQuest(quest.id);
    navigate(links.quiz(quest.id));
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-900/70 border border-gray-700 rounded-2xl shadow-2xl p-6 sm:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <QuestIcon className="w-10 h-10 text-amber-300" />
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Learning Quest</p>
            <h1 className="text-3xl font-bold text-amber-200">{quest.title}</h1>
          </div>
        </div>
        <Link
          to="/quests"
          className="self-start sm:self-auto bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Back to Quests
        </Link>
      </div>

      {character && (
        <div className="flex items-center gap-4 mb-6">
          <img
            src={character.portraitUrl}
            alt={character.name}
            className="w-20 h-20 rounded-full border-2 border-amber-300"
          />
          <div>
            <p className="text-sm text-gray-400">Mentor</p>
            <h2 className="text-2xl font-semibold text-amber-200">{character.name}</h2>
            <p className="text-gray-400 text-sm">{character.title}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-amber-200 font-semibold mb-2">Quest Objective</p>
          <p className="text-gray-100 leading-relaxed">{quest.objective}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-amber-200 font-semibold mb-2">Estimated Duration</p>
          <p className="text-gray-100 text-lg font-semibold">{quest.duration}</p>
          {isCompleted && (
            <span className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/40 text-emerald-100 text-xs font-semibold uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-300" /> Completed
            </span>
          )}
          {!isCompleted && isInProgress && (
            <span className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-700/40 text-teal-100 text-xs font-semibold uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-teal-300" /> In Progress
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 bg-gray-800/60 border border-gray-700 rounded-xl p-5">
        <p className="text-xs uppercase tracking-wide text-amber-200 font-semibold mb-2">Focus Points</p>
        <ul className="list-disc list-inside space-y-2 text-gray-200">
          {quest.focusPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={beginQuest}
          className={`flex-1 rounded-lg px-4 py-3 font-semibold transition-colors ${
            isCompleted ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-amber-600 hover:bg-amber-500 text-black'
          }`}
        >
          {isCompleted ? 'Review with Mentor' : isInProgress ? 'Continue Quest' : 'Begin Quest'}
        </button>
        <button
          type="button"
          onClick={startQuiz}
          className="flex-1 rounded-lg px-4 py-3 font-semibold border border-amber-500/70 text-amber-200 hover:bg-amber-500/10 transition-colors"
        >
          {isCompleted ? 'Retake Quiz' : 'Preview Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuestDetail;
