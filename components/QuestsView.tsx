
import React from 'react';
import type { Quest, Character, QuestProgressRecord } from '../types';
import QuestIcon from './icons/QuestIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface QuestsViewProps {
  quests: Quest[];
  characters: Character[];
  onSelectQuest: (quest: Quest) => void;
  onBack: () => void;
  questProgress: Record<string, QuestProgressRecord>;
}

const QuestsView: React.FC<QuestsViewProps> = ({ quests, characters, onSelectQuest, onBack, questProgress }) => {
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
            const progress = questProgress[quest.id];
            const isCompleted = progress?.status === 'completed';
            const demonstratedPoints = progress?.demonstratedPoints?.filter(point => point.trim()) ?? [];
            const previewPoints = demonstratedPoints.slice(0, 3);

            return (
              <div
                key={quest.id}
                className={`relative bg-gray-800/50 p-5 rounded-lg border ${isCompleted ? 'border-emerald-500/40 hover:border-emerald-400/80' : 'border-gray-700 hover:border-amber-400'} flex flex-col text-center transition-colors duration-300`}
              >
                <img src={character.portraitUrl} alt={character.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-amber-300" />
                <h3 className="font-bold text-xl text-amber-300">{quest.title}</h3>
                <p className="text-sm text-gray-400 mt-1">with {character.name}</p>
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
                {progress && (
                  <div className={`mt-4 text-left text-sm rounded-lg border ${isCompleted ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/50 bg-amber-500/10 text-amber-100'} p-3 space-y-2`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircleIcon className="w-4 h-4" />
                        ) : (
                          <QuestIcon className="w-4 h-4" />
                        )}
                        <span className="font-semibold uppercase tracking-wide text-xs">
                          {isCompleted ? 'Completed' : 'Needs Review'}
                        </span>
                      </div>
                      {progress.lastChecked && (
                        <span className="text-[11px] text-white/70">{new Date(progress.lastChecked).toLocaleDateString()}</span>
                      )}
                    </div>
                    <p className="opacity-90 leading-snug">{progress.rationale}</p>
                    {previewPoints.length > 0 && (
                      <ul className="list-disc list-inside space-y-1 opacity-80">
                        {previewPoints.map(point => (
                          <li key={point}>{point}</li>
                        ))}
                        {demonstratedPoints.length > previewPoints.length && (
                          <li className="italic">…and more</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
                <button
                  onClick={() => onSelectQuest(quest)}
                  className={`mt-6 font-bold py-2 px-4 rounded-lg transition-colors w-full ${isCompleted ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-amber-600 hover:bg-amber-500 text-black'}`}
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
