
import React from 'react';
import type { Quest, Character } from '../types';
import QuestIcon from './icons/QuestIcon';

interface QuestsViewProps {
  quests: Quest[];
  characters: Character[];
  completedQuestIds: string[];
  onSelectQuest: (quest: Quest) => void;
  onBack: () => void;
  onCreateQuest: () => void;
}

const QuestsView: React.FC<QuestsViewProps> = ({ quests, characters, completedQuestIds, onSelectQuest, onBack, onCreateQuest }) => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <QuestIcon className="w-8 h-8 text-amber-300" />
          <h2 className="text-3xl font-bold text-amber-200">Learning Quests</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCreateQuest}
            className="bg-teal-700 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Create Custom Quest
          </button>
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Ancients
          </button>
        </div>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-6 mb-10 text-left text-gray-300">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">How Learning Quests Work</p>
        <h3 className="text-2xl font-semibold text-white mt-2">Follow a guided path or craft your own adventure</h3>
        <div className="grid md:grid-cols-2 gap-6 mt-6 text-sm">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-amber-200 uppercase tracking-wide text-xs mb-1">Pick a Quest</p>
              <p className="leading-relaxed text-gray-300/90">
                Browse the curated quests below to dive into a focused lesson with a historical mentor. Each quest keeps the conversation anchored to a clear learning objective and timed checkpoints.
              </p>
            </div>
            <div>
              <p className="font-semibold text-amber-200 uppercase tracking-wide text-xs mb-1">Stay on Track</p>
              <p className="leading-relaxed text-gray-300/90">
                Your mentor highlights milestones and focus points along the way. Completed quests are marked so you can revisit them for reinforcement or move on to the next topic.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-teal-300 uppercase tracking-wide text-xs mb-1">Create a Learning Quest</p>
              <p className="leading-relaxed text-gray-300/90">
                Want something tailor-made? Select <span className="text-white font-semibold">Create Custom Quest</span> to launch the quest builder. Describe your goal, choose a mentor, and set the skills or checkpoints you want covered.
              </p>
            </div>
            <div>
              <p className="font-semibold text-teal-300 uppercase tracking-wide text-xs mb-1">Launch & Iterate</p>
              <p className="leading-relaxed text-gray-300/90">
                After you generate the quest, start the conversation immediately or return here to compare it with existing journeys. You can refine custom quests anytime to sharpen your learning plan.
              </p>
            </div>
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

            return (
              <div
                key={quest.id}
                className={`bg-gray-800/50 p-5 rounded-lg border flex flex-col text-center transition-colors duration-300 ${isCompleted ? 'border-emerald-600/80 shadow-lg shadow-emerald-900/40' : 'border-gray-700 hover:border-amber-400'}`}
              >
                <img src={character.portraitUrl} alt={character.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-amber-300" />
                <h3 className="font-bold text-xl text-amber-300">{quest.title}</h3>
                <p className="text-sm text-gray-400 mt-1">with {character.name}</p>
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
                    {isCompleted ? 'Review Quest' : 'Begin Quest'}
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
