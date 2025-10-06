import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Character } from '../../types';
import CharacterSelector from '../../components/CharacterSelector';
import CharacterCreator from '../../components/CharacterCreator';
import Instructions from '../../components/Instructions';
import QuestIcon from '../../components/icons/QuestIcon';
import { links } from '../lib/links';
import { useAppState } from '../state/AppStateContext';

const Selector: React.FC = () => {
  const navigate = useNavigate();
  const {
    characters,
    quests,
    completedQuests,
    lastQuestOutcome,
    lastQuizResult,
    beginConversationWithCharacter,
    beginQuestConversation,
    launchQuizForQuest,
    deleteCustomCharacter,
    prefillQuestFromNextSteps,
    setQuestCreatorPrefill,
    questCreatorPrefill,
    addCustomCharacter,
    pendingQuizAssessment,
  } = useAppState();
  const [showCreator, setShowCreator] = React.useState(false);

  const lastQuizQuest = React.useMemo(() => {
    if (!lastQuizResult) {
      return null;
    }
    return quests.find((quest) => quest.id === lastQuizResult.questId) ?? null;
  }, [lastQuizResult, quests]);

  const handleSelectCharacter = (character: Character) => {
    beginConversationWithCharacter(character);
    navigate(links.conversation(character.id));
  };

  const handleCreateQuestFromNextSteps = (steps: string[], questTitle?: string) => {
    prefillQuestFromNextSteps(steps, questTitle);
    navigate(links.questCreator());
  };

  const handleContinueQuest = (questId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) {
      return;
    }
    const character = beginQuestConversation(quest);
    if (character) {
      navigate(links.conversation(character.id));
    }
  };

  const handleLaunchQuiz = (questId: string) => {
    const quest = launchQuizForQuest(questId);
    if (!quest) {
      return;
    }
    navigate(links.quiz(quest.id));
  };

  const handleCharacterCreated = (character: Character) => {
    addCustomCharacter(character);
    setShowCreator(false);
    beginConversationWithCharacter(character);
    navigate(links.conversation(character.id));
  };

  const handleStartCreateQuest = () => {
    if (questCreatorPrefill) {
      setQuestCreatorPrefill(null);
    }
    navigate(links.questCreator());
  };

  if (showCreator) {
    return (
      <CharacterCreator
        onCharacterCreated={handleCharacterCreated}
        onBack={() => setShowCreator(false)}
      />
    );
  }

  return (
    <div className="text-center animate-fade-in">
      <p className="max-w-3xl mx-auto mb-8 text-gray-400 text-lg">
        Engage in real-time voice conversations with legendary minds from history, or embark on a guided Learning Quest to master a new subject.
      </p>

      <div className="max-w-3xl mx-auto mb-8 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-left">
        <p className="text-sm text-gray-300 mb-2 font-semibold">Quest Progress</p>
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
          {completedQuests.length} of {quests.length} quests completed
        </p>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.round((completedQuests.length / Math.max(quests.length, 1)) * 100))}%`,
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

          {lastQuestOutcome.evidence.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-emerald-200 uppercase tracking-wide mb-1">Highlights</p>
              <ul className="list-disc list-inside text-gray-100 space-y-1 text-sm">
                {lastQuestOutcome.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {!lastQuestOutcome.passed && lastQuestOutcome.improvements.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-red-200 uppercase tracking-wide mb-1">Next Steps</p>
              <ul className="list-disc list-inside text-red-100 space-y-1 text-sm">
                {lastQuestOutcome.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleCreateQuestFromNextSteps(lastQuestOutcome.improvements, lastQuestOutcome.questTitle)}
                className="mt-3 inline-flex items-center text-sm font-semibold text-teal-200 border border-teal-500/60 px-3 py-1.5 rounded-md hover:bg-teal-600/20 focus:outline-none focus:ring-2 focus:ring-teal-400/60"
              >
                Turn next steps into a new quest
              </button>
            </div>
          )}

          {!lastQuestOutcome.passed && lastQuestOutcome.questId && (
            <button
              type="button"
              onClick={() => handleContinueQuest(lastQuestOutcome.questId!)}
              className="mt-4 inline-flex items-center text-sm font-semibold text-amber-200 hover:text-amber-100 hover:underline focus:outline-none"
            >
              Continue quest?
            </button>
          )}
        </div>
      )}

      {lastQuizResult && (
        <div className="max-w-3xl mx-auto mb-8 rounded-lg border border-amber-500/40 bg-amber-900/20 p-6 text-left shadow-lg shadow-amber-900/30">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-300 font-semibold">Latest Quiz Result</p>
              <h3 className="text-2xl font-bold text-amber-200 mt-1">{lastQuizQuest?.title ?? 'Quest Mastery Quiz'}</h3>
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
              onClick={() => handleLaunchQuiz(lastQuizResult.questId)}
              className="rounded-lg border border-amber-500/70 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
            >
              {lastQuizResult.passed ? 'Retake for practice' : 'Retry quiz'}
            </button>
          </div>
        </div>
      )}

      {pendingQuizAssessment && (
        <div className="max-w-3xl mx-auto mb-8 rounded-lg border border-emerald-500/50 bg-emerald-900/20 p-5 text-left shadow-lg">
          <p className="text-sm text-emerald-200">
            Ready for the mastery quiz? Continue to confirm your knowledge.
          </p>
          <button
            type="button"
            onClick={() => handleLaunchQuiz(pendingQuizAssessment.questId)}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Take the quiz
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12">
        <Link
          to={links.quests()}
          className="flex items-center gap-3 bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-8 rounded-lg transition-colors duration-300 text-lg w-full sm:w-auto"
          onClick={() => setQuestCreatorPrefill(null)}
        >
          <QuestIcon className="w-6 h-6" />
          <span>Learning Quests</span>
        </Link>

        <Link
          to={links.history()}
          className="bg-gray-700 hover:bg-gray-600 text-amber-300 font-bold py-3 px-8 rounded-lg transition-colors duration-300 border border-gray-600 w-full sm:w-auto"
        >
          View Conversation History
        </Link>

        <button
          type="button"
          onClick={handleStartCreateQuest}
          className="bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300 w-full sm:w-auto"
        >
          Create Your Quest
        </button>
      </div>

      <Instructions />

      <CharacterSelector
        characters={characters}
        onSelectCharacter={handleSelectCharacter}
        onStartCreation={() => setShowCreator(true)}
        onDeleteCharacter={deleteCustomCharacter}
      />
    </div>
  );
};

export default Selector;
