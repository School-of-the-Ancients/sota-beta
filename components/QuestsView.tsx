
import React, { useMemo } from 'react';
import type { Quest, Character, QuestAssessment } from '../types';
import QuestIcon from './icons/QuestIcon';

interface QuestsViewProps {
  quests: Quest[];
  characters: Character[];
  onSelectQuest: (quest: Quest) => void;
  onBack: () => void;
  completedQuestIds: string[];
  latestResult: QuestAssessment | null;
  onDismissResult: () => void;
}

const QuestsView: React.FC<QuestsViewProps> = ({ quests, characters, onSelectQuest, onBack, completedQuestIds, latestResult, onDismissResult }) => {
  const activeResult = useMemo(() => {
    if (!latestResult) return null;
    return quests.some(q => q.id === latestResult.questId) ? latestResult : null;
  }, [latestResult, quests]);

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

      {activeResult && (
        <div
          className={`mb-8 p-5 rounded-lg border text-left ${
            activeResult.passed ? 'border-emerald-500/70 bg-emerald-900/30' : 'border-amber-500/70 bg-amber-900/30'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                {activeResult.passed ? 'Quest Completed' : 'Quest Review Needed'}
              </p>
              <h3 className="text-xl font-bold text-amber-100 mt-1">{activeResult.questTitle}</h3>
            </div>
            <button
              onClick={onDismissResult}
              className="text-xs font-semibold text-gray-300 hover:text-white bg-gray-800/60 border border-gray-700 px-3 py-1 rounded-md transition-colors"
            >
              Dismiss
            </button>
          </div>
          <p className="text-gray-200 mt-3 leading-relaxed">{activeResult.feedback}</p>
          {activeResult.evidence.length > 0 && (
            <ul className="list-disc list-inside mt-3 space-y-1 text-sm text-gray-200/90">
              {activeResult.evidence.map((item, index) => (
                <li key={`${activeResult.questId}-quest-card-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-center text-gray-400 mb-8">
        Embark on a guided journey to explore a specific topic. Your mentor will steer the conversation towards a defined learning objective.
      </p>

      {quests.length === 0 ? (
        <p className="text-center text-gray-400 bg-gray-800/50 p-8 rounded-lg">No quests available yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quests.map((quest) => {
            const character = characters.find(c => c.id === quest.characterId);
            if (!character) return null;
            const isCompleted = completedQuestIds.includes(quest.id);

            return (
              <div key={quest.id} className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 flex flex-col text-center hover:border-amber-400 transition-colors duration-300">
                <img src={character.portraitUrl} alt={character.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-amber-300" />
                <div className="flex items-start justify-between gap-2">
                  <div className="text-left">
                    <h3 className="font-bold text-xl text-amber-300 leading-snug">{quest.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">with {character.name}</p>
                  </div>
                  {isCompleted && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold uppercase tracking-wide">
                      Completed
                    </span>
                  )}
                </div>
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
                    className="mt-6 bg-amber-600 hover:bg-amber-500 text-black font-bold py-2 px-4 rounded-lg transition-colors w-full"
                >
                    {isCompleted ? 'Retake Quest' : 'Begin Quest'}
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
