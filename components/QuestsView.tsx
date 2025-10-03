
import React from 'react';
import type { Quest, Character } from '../types';
import QuestIcon from './icons/QuestIcon';

interface QuestsViewProps {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  inProgressQuestIds: string[];
  customQuestIds?: string[];
  onSelectQuest: (quest: Quest) => void;
  onBack: () => void;
  onCreateQuest: () => void;
}

const QuestsView: React.FC<QuestsViewProps> = ({
  quests,
  characters,
  completedQuestIds,
  inProgressQuestIds,
  customQuestIds = [],
  onSelectQuest,
  onBack,
  onCreateQuest,
}) => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <QuestIcon className="w-8 h-8 text-amber-300"/>
            <h2 className="text-3xl font-bold text-amber-200">Learning Quests</h2>
        </div>
        <button onClick={onBack} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Back to Ancients
        </button>
      </div>

      <div className="mb-8 bg-gray-900/60 border border-amber-400/40 rounded-xl p-6 shadow-lg shadow-amber-900/20">
        <h3 className="text-xl font-semibold text-amber-200 tracking-wide text-center sm:text-left">How Learning Quests Work</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-3">
              <span className="text-amber-300 font-bold">1</span>
              <span>
                Pick a quest to unlock a focused dialogue. Your chosen mentor will guide every response toward the highlighted objective.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-300 font-bold">2</span>
              <span>
                Follow the focus points to keep the conversation on track and earn completion by demonstrating what you have learned.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-300 font-bold">3</span>
              <span>
                Need something more specific? Describe your goal and we will design a fresh quest with the best mentor for the job.
              </span>
            </li>
          </ol>
          <div className="flex flex-col justify-between gap-4 bg-gray-800/60 border border-gray-700 rounded-lg p-4 text-sm text-gray-300">
            <p>
              Use <span className="font-semibold text-amber-200">Create Your Quest</span> to craft a bespoke path. Share what you want to master, choose optional preferences, and we will pair you with a new mentor and quest outline.
            </p>
            <button
              onClick={onCreateQuest}
              className="inline-flex items-center justify-center gap-2 self-start bg-teal-600 hover:bg-teal-500 text-black font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              <QuestIcon className="w-5 h-5" />
              Create Your Quest
            </button>
          </div>
        </div>
      </div>

      {quests.length === 0 ? (
        <p className="text-center text-gray-400 bg-gray-800/50 p-8 rounded-lg">No quests available yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quests.map((quest) => {
            const character = characters.find(c => c.id === quest.characterId);
            if (!character) return null;
            const isCompleted = completedQuestIds.includes(quest.id);
            const isInProgress = inProgressQuestIds.includes(quest.id) && !isCompleted;
            const isCustom = customQuestIds.includes(quest.id);
            const buttonLabel = isCompleted
              ? 'Review Quest'
              : isInProgress
              ? 'Continue Quest'
              : 'Begin Quest';

            return (
              <div
                key={quest.id}
                className={`bg-gray-800/50 p-5 rounded-lg border flex flex-col text-center transition-colors duration-300 ${isCompleted ? 'border-emerald-600/80 shadow-lg shadow-emerald-900/40' : 'border-gray-700 hover:border-amber-400'}`}
              >
                <img src={character.portraitUrl} alt={character.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-amber-300" />
                <h3 className="font-bold text-xl text-amber-300">{quest.title}</h3>
                <p className="text-sm text-gray-400 mt-1">with {character.name}</p>
                <div className="flex justify-center gap-2 mt-2">
                  {isCustom && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-semibold uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-teal-300" />
                      Custom Quest
                    </span>
                  )}
                  {isInProgress && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-amber-300" />
                      In Progress
                    </span>
                  )}
                </div>
                {isCompleted && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/30 text-emerald-200 text-xs font-semibold uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-emerald-300" />
                      Completed
                    </span>
                  </div>
                )}
                <div className="mt-3 mb-4">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold uppercase tracking-wide">
                    {quest.duration}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mb-4">{quest.description}</p>
                <div className="text-left text-sm text-gray-300 space-y-3 flex-grow">
                  <div>
                    <p className="font-semibold text-amber-200 uppercase tracking-wide text-xs mb-1">Objective</p>
                    <p className="text-gray-300 leading-relaxed">{quest.objective}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-200 uppercase tracking-wide text-xs mb-1">Focus Points</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-300/90">
                      {quest.focusPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                    onClick={() => onSelectQuest(quest)}
                    className={`mt-6 font-bold py-2 px-4 rounded-lg transition-colors w-full ${isCompleted ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-amber-600 hover:bg-amber-500 text-black'}`}
                >
                    {buttonLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuestsView;
