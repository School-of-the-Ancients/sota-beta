
import React from 'react';
import type { Quest, Character } from '../types';
import QuestIcon from './icons/QuestIcon';

interface QuestsViewProps {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  onSelectQuest: (quest: Quest) => void;
  onBack: () => void;
}

const QuestsView: React.FC<QuestsViewProps> = ({ quests, characters, completedQuestIds, onSelectQuest, onBack }) => {
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
              <div
                key={quest.id}
                className={`bg-gray-800/50 p-5 rounded-lg border flex flex-col text-center transition-colors duration-300 hover:border-amber-400 ${isCompleted ? 'border-emerald-500/60' : 'border-gray-700'}`}
              >
                <img src={character.portraitUrl} alt={character.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-amber-300" />
                <h3 className="font-bold text-xl text-amber-300">{quest.title}</h3>
                <p className="text-sm text-gray-400 mt-1 mb-4">with {character.name}</p>
                <p className="text-gray-300 flex-grow text-sm mb-3">{quest.description}</p>
                <p className="text-xs text-amber-200/80 bg-amber-900/40 border border-amber-800/60 rounded-lg px-3 py-2 mb-4">
                  <span className="block text-amber-300 font-semibold uppercase tracking-wide mb-1">Objective</span>
                  <span className="block text-left text-amber-100/90">{quest.objective}</span>
                </p>
                {isCompleted && (
                  <span className="mb-3 inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Completed
                  </span>
                )}
                <button
                    onClick={() => onSelectQuest(quest)}
                    className={`mt-auto font-bold py-2 px-4 rounded-lg transition-colors w-full ${isCompleted ? 'bg-amber-500/80 hover:bg-amber-400 text-black' : 'bg-amber-600 hover:bg-amber-500 text-black'}`}
                >
                    {isCompleted ? 'Revisit Quest' : 'Begin Quest'}
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
