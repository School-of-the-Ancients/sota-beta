
import React from 'react';
import type { Quest, Character } from '../types';
import QuestIcon from './icons/QuestIcon';

interface QuestsViewProps {
  quests: Quest[];
  characters: Character[];
  onSelectQuest: (quest: Quest) => void;
  onBack: () => void;
}

const QuestsView: React.FC<QuestsViewProps> = ({ quests, characters, onSelectQuest, onBack }) => {
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

            return (
              <div key={quest.id} className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 flex flex-col text-center hover:border-amber-400 transition-colors duration-300">
                <img src={character.portraitUrl} alt={character.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-amber-300" />
                <h3 className="font-bold text-xl text-amber-300">{quest.title}</h3>
                <p className="text-sm text-gray-400 mt-1 mb-4">with {character.name}</p>
                <div className="flex flex-col flex-grow gap-4 mb-5">
                  <p className="text-gray-300 text-sm">{quest.description}</p>
                  {quest.milestones.length > 0 && (
                    <div className="text-left bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                      <p className="text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">Milestones</p>
                      <ul className="space-y-2">
                        {quest.milestones.map((milestone) => (
                          <li key={milestone} className="flex items-start gap-2 text-xs text-gray-200">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                            <span className="text-left">{milestone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                    onClick={() => onSelectQuest(quest)}
                    className="mt-auto bg-amber-600 hover:bg-amber-500 text-black font-bold py-2 px-4 rounded-lg transition-colors w-full"
                >
                    Begin Quest
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
