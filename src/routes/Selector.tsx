import React from 'react';
import Instructions from '@/components/Instructions';
import CharacterSelector from '@/components/CharacterSelector';
import QuestIcon from '@/components/icons/QuestIcon';
import type { Character, Quest, QuestAssessment, QuizResult } from '@/types';

type SelectorRouteProps = {
  availableCharacters: Character[];
  completedQuestIds: string[];
  allQuests: Quest[];
  lastQuestOutcome: QuestAssessment | null;
  lastQuizResult: QuizResult | null;
  lastQuizQuest: Quest | null;
  onSelectCharacter: (character: Character) => void;
  onCreateCharacter: () => void;
  onDeleteCharacter: (characterId: string) => void;
  onOpenQuests: () => void;
  onOpenHistory: () => void;
  onOpenQuestCreator: () => void;
  onContinueQuest: (questId: string | undefined) => void;
  onLaunchQuiz: (questId: string) => void;
};

const Selector: React.FC<SelectorRouteProps> = ({
  availableCharacters,
  completedQuestIds,
  allQuests,
  lastQuestOutcome,
  lastQuizResult,
  lastQuizQuest,
  onSelectCharacter,
  onCreateCharacter,
  onDeleteCharacter,
  onOpenQuests,
  onOpenHistory,
  onOpenQuestCreator,
  onContinueQuest,
  onLaunchQuiz,
}) => {
  return (
    <div className="text-center animate-fade-in">
      <p className="max-w-3xl mx-auto mb-8 text-gray-400 text-lg">
        Engage in real-time voice conversations with legendary minds from history, or embark on a guided Learning
        Quest to master a new subject.
      </p>

      <div className="max-w-3xl mx-auto mb-8 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-left">
        <p className="text-sm text-gray-300 mb-2 font-semibold">Quest Progress</p>
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
          {completedQuestIds.length} of {allQuests.length} quests completed
        </p>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{
              width: `${Math.min(
                100,
                Math.round((completedQuestIds.length / Math.max(allQuests.length, 1)) * 100)
              )}%`,
            }}
          />
        </div>
      </div>

      {lastQuestOutcome && (
        <div
          className={`max-w-3xl mx-auto mb-8 rounded-lg border p-5 text-left shadow-lg ${
            lastQuestOutcome.passed ? 'bg-emerald-900/40 border-emerald-700' : 'bg-red-900/30 border-red-700'
          }`}
        >
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-300 font-semibold">Latest Quest Review</p>
              <h3 className="text-2xl font-bold text-amber-200 mt-1">{lastQuestOutcome.questTitle}</h3>
            </div>
            <span
              className={`text-sm font-semibold px-3 py-1 rounded-full ${
                lastQuestOutcome.passed ? 'bg-emerald-600 text-emerald-50' : 'bg-red-600 text-red-50'
              }`}
            >
              {lastQuestOutcome.passed ? 'Completed' : 'Needs Review'}
            </span>
          </div>
          <p className="text-gray-200 mt-4 leading-relaxed">{lastQuestOutcome.summary}</p>
          {lastQuestOutcome.improvements?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-amber-200 mb-2">Suggested next steps</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-200">
                {lastQuestOutcome.improvements.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          )}
          {lastQuestOutcome.questId && (
            <button
              type="button"
              onClick={() => onContinueQuest(lastQuestOutcome.questId)}
              className="mt-4 inline-flex items-center text-sm font-semibold text-amber-200 hover:text-amber-100 hover:underline focus:outline-none"
            >
              Continue quest?
            </button>
          )}
        </div>
      )}

      {lastQuizResult && (
        <div
          className={`max-w-3xl mx-auto mb-8 rounded-lg border p-5 text-left shadow-lg ${
            lastQuizResult.passed ? 'bg-emerald-900/30 border-emerald-700/80' : 'bg-amber-900/30 border-amber-700/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-300 font-semibold">Latest Quiz Result</p>
              <h3 className="text-2xl font-bold text-amber-200 mt-1">
                {lastQuizQuest?.title ?? 'Quest Mastery Quiz'}
              </h3>
            </div>
            <span
              className={`text-sm font-semibold px-3 py-1 rounded-full ${
                lastQuizResult.passed ? 'bg-emerald-600 text-emerald-50' : 'bg-amber-600 text-amber-50'
              }`}
            >
              {lastQuizResult.passed ? 'Mastery Confirmed' : 'Needs Review'}
            </span>
          </div>

          <p className="text-gray-200 mt-4 text-lg font-semibold">
            Score: {lastQuizResult.correct} / {lastQuizResult.total} correct ({Math.round(lastQuizResult.scoreRatio * 100)}%)
          </p>

          {lastQuizResult.missedObjectiveTags.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-amber-200 mb-2">Review focus areas</p>
              <div className="flex flex-wrap justify-center gap-2">
                {lastQuizResult.missedObjectiveTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-amber-500/70 bg-amber-900/30 px-3 py-1 text-xs text-amber-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            <button
              type="button"
              onClick={() => onLaunchQuiz(lastQuizResult.questId)}
              className="rounded-lg border border-amber-500/70 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
            >
              {lastQuizResult.passed ? 'Retake for practice' : 'Retry quiz'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12">
        <button
          onClick={onOpenQuests}
          className="flex items-center gap-3 bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-8 rounded-lg transition-colors duration-300 text-lg w-full sm:w-auto"
        >
          <QuestIcon className="w-6 h-6" />
          <span>Learning Quests</span>
        </button>

        <button
          onClick={onOpenHistory}
          className="bg-gray-700 hover:bg-gray-600 text-amber-300 font-bold py-3 px-8 rounded-lg transition-colors duration-300 border border-gray-600 w-full sm:w-auto"
        >
          View Conversation History
        </button>

        <button
          onClick={onOpenQuestCreator}
          className="bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300 w-full sm:w-auto"
        >
          Create Your Quest
        </button>
      </div>

      <Instructions />

      <CharacterSelector
        characters={availableCharacters}
        onSelectCharacter={onSelectCharacter}
        onStartCreation={onCreateCharacter}
        onDeleteCharacter={onDeleteCharacter}
      />
    </div>
  );
};

export default Selector;
