import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { Quest } from '../../types';
import { links } from '../lib/links';
import { useAppState } from '../state/AppStateContext';

const QuestDetail: React.FC = () => {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();
  const {
    quests,
    characters,
    completedQuests,
    inProgressQuestIds,
    beginQuestConversation,
    launchQuizForQuest,
    deleteQuest,
    customQuests,
  } = useAppState();

  const quest = React.useMemo(() => quests.find((q) => q.id === questId) ?? null, [quests, questId]);

  if (!quest) {
    return <Navigate to={links.quests()} replace />;
  }

  const character = characters.find((c) => c.id === quest.characterId) || null;
  const isCompleted = completedQuests.includes(quest.id);
  const isInProgress = inProgressQuestIds.includes(quest.id) && !isCompleted;
  const isCustom = customQuests.some((q) => q.id === quest.id);

  const handleBeginQuest = (selectedQuest: Quest) => {
    const mentor = beginQuestConversation(selectedQuest);
    if (mentor) {
      navigate(links.conversation(mentor.id));
    }
  };

  const handleLaunchQuiz = (selectedQuest: Quest) => {
    const target = launchQuizForQuest(selectedQuest.id);
    if (target) {
      navigate(links.quiz(target.id));
    }
  };

  const handleDelete = () => {
    deleteQuest(quest.id);
    navigate(links.quests());
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <button
        type="button"
        onClick={() => navigate(links.quests())}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200 hover:underline"
      >
        &larr; Back to quests
      </button>

      <div className="bg-gray-900/60 border border-amber-400/40 rounded-2xl p-6 shadow-xl shadow-amber-900/20">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {character && (
            <img
              src={character.portraitUrl}
              alt={character.name}
              className="w-32 h-32 rounded-full border-2 border-amber-300 mx-auto md:mx-0"
            />
          )}
          <div className="flex-1 text-left">
            <p className="text-xs uppercase tracking-wide text-gray-300 font-semibold">Learning Quest</p>
            <h1 className="text-3xl font-bold text-amber-200 mt-1">{quest.title}</h1>
            {character && <p className="text-sm text-gray-400 mt-1">with {character.name}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold uppercase tracking-wide">
                {quest.duration}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/30 text-emerald-200 text-xs font-semibold uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-300" />
                  Completed
                </span>
              )}
              {!isCompleted && isInProgress && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-700/30 text-teal-200 text-xs font-semibold uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-teal-300" />
                  In Progress
                </span>
              )}
            </div>
            <p className="text-gray-300 mt-4 text-base leading-relaxed">{quest.description}</p>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6 text-left">
          <div>
            <p className="font-semibold text-amber-200 uppercase tracking-wide text-xs mb-2">Objective</p>
            <p className="text-gray-300 leading-relaxed">{quest.objective}</p>
          </div>
          <div>
            <p className="font-semibold text-amber-200 uppercase tracking-wide text-xs mb-2">Focus Points</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              {quest.focusPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => handleBeginQuest(quest)}
              className={`font-bold py-2 px-4 rounded-lg transition-colors ${
                isCompleted ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-amber-600 hover:bg-amber-500 text-black'
              }`}
            >
              {isCompleted ? 'Review with mentor' : isInProgress ? 'Continue quest' : 'Begin quest'}
            </button>
            <button
              type="button"
              onClick={() => handleLaunchQuiz(quest)}
              className="font-bold py-2 px-4 rounded-lg transition-colors bg-teal-700 hover:bg-teal-600 text-white"
            >
              {isCompleted ? 'Retake mastery quiz' : 'Take mastery quiz'}
            </button>
          </div>

          {isCustom && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm font-semibold text-red-200 bg-red-900/40 hover:bg-red-900/60 px-4 py-2 rounded-md border border-red-700/60"
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
