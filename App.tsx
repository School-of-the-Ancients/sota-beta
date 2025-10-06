import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';

import type {
  Character,
  Quest,
  ConversationTurn,
  SavedConversation,
  Summary,
  QuestAssessment,
  QuizResult,
} from './types';

import CharacterSelector from './components/CharacterSelector';
import ConversationView from './components/ConversationView';
import HistoryView from './components/HistoryView';
import CharacterCreator from './components/CharacterCreator';
import QuestsView from './components/QuestsView';
import Instructions from './components/Instructions';
import QuestIcon from './components/icons/QuestIcon';
import QuestCreator from './components/QuestCreator'; // NEW
import QuestQuiz from './components/QuestQuiz';

import { CHARACTERS, QUESTS } from './constants';

import { useSupabaseAuth, type SupabaseAuthState } from './hooks/useSupabaseAuth';
import { UserDataProvider, useUserData } from './context/UserDataContext';


const updateCharacterQueryParam = (characterId: string, mode: 'push' | 'replace') => {
  try {
    const params = new URLSearchParams(window.location.search);
    params.set('character', characterId);
    const pathname = typeof window.location.pathname === 'string' && window.location.pathname
      ? window.location.pathname
      : '/';
    const newSearch = params.toString();
    const nextUrl = `${pathname}${newSearch ? `?${newSearch}` : ''}`;
    if (mode === 'push') {
      window.history.pushState({}, '', nextUrl);
    } else {
      window.history.replaceState({}, '', nextUrl);
    }
  } catch (error) {
    console.warn('Failed to update character query parameter:', error);
  }
};

// ---- App -------------------------------------------------------------------

const AppShell: React.FC<{ auth: SupabaseAuthState }> = ({ auth }) => {
  const {
    conversations,
    customCharacters,
    customQuests,
    completedQuestIds,
    lastQuizResult,
    activeQuestId,
    isLoading: isUserStateLoading,
    isSyncing: isUserStateSyncing,
    error: userStateError,
    upsertConversation,
    markQuestCompleted,
    markQuestIncomplete,
    upsertCustomQuest,
    deleteCustomQuest,
    upsertCustomCharacter,
    deleteCustomCharacter,
    setLastQuizResult: persistLastQuizResult,
    setActiveQuestId,
  } = useUserData();

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<
    'selector' | 'conversation' | 'history' | 'creator' | 'quests' | 'questCreator' | 'quiz'
  >('selector');

  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);

  // end-conversation save/AI-eval flag
  const [isSaving, setIsSaving] = useState(false);

  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [inProgressQuestIds, setInProgressQuestIds] = useState<string[]>([]);
  const [questCreatorPrefill, setQuestCreatorPrefill] = useState<string | null>(null);
  const [quizQuest, setQuizQuest] = useState<Quest | null>(null);
  const [quizAssessment, setQuizAssessment] = useState<QuestAssessment | null>(null);

  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const allQuests = useMemo(() => [...customQuests, ...QUESTS], [customQuests]);
  const lastQuizQuest = useMemo(() => {
    if (!lastQuizResult) {
      return null;
    }
    return allQuests.find((quest) => quest.id === lastQuizResult.questId) ?? null;
  }, [allQuests, lastQuizResult]);

  useEffect(() => {
    if (customQuests.length === 0) {
      return;
    }

    const availableCharacterIds = new Set([
      ...customCharacters.map((character) => character.id),
      ...CHARACTERS.map((character) => character.id),
    ]);

    customQuests.forEach((quest) => {
      if (!availableCharacterIds.has(quest.characterId)) {
        deleteCustomQuest(quest.id);
      }
    });
  }, [customQuests, customCharacters, deleteCustomQuest]);

  const syncQuestProgress = useCallback(() => {
    const inProgress = new Set<string>();
    conversations.forEach((conversation) => {
      if (!conversation.questId) {
        return;
      }
      if (conversation.questAssessment?.passed) {
        return;
      }
      if (conversation.transcript && conversation.transcript.length > 1) {
        inProgress.add(conversation.questId);
      }
    });
    setInProgressQuestIds(Array.from(inProgress));
  }, [conversations]);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (auth.session) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setShowAuthDialog(true);
      setAuthFeedback('Sign in to continue your quests and conversations.');
    },
    [auth.session],
  );

  // On state hydration: align quest + character selections and compute progress
  useEffect(() => {
    if (isUserStateLoading) {
      return;
    }

    const allCharacters = [...customCharacters, ...CHARACTERS];
    const availableQuests = [...customQuests, ...QUESTS];

    let derivedCharacter: Character | null = null;

    if (activeQuestId) {
      const questFromState = availableQuests.find((quest) => quest.id === activeQuestId) ?? null;
      if (questFromState) {
        setActiveQuest(questFromState);
        const questCharacter = allCharacters.find((character) => character.id === questFromState.characterId) ?? null;
        if (questCharacter) {
          derivedCharacter = questCharacter;
        }
      } else {
        setActiveQuestId(null);
        setActiveQuest(null);
      }
    } else {
      setActiveQuest(null);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const queryCharacterId = urlParams.get('character');
    if (!derivedCharacter && queryCharacterId) {
      const characterFromQuery = allCharacters.find((character) => character.id === queryCharacterId);
      if (characterFromQuery) {
        derivedCharacter = characterFromQuery;
      }
    }

    if (derivedCharacter) {
      setSelectedCharacter(derivedCharacter);
      setView('conversation');
      updateCharacterQueryParam(derivedCharacter.id, 'replace');
    } else if (!activeQuestId) {
      setSelectedCharacter(null);
      setView('selector');
    }

    syncQuestProgress();
  }, [
    isUserStateLoading,
    customCharacters,
    customQuests,
    activeQuestId,
    setActiveQuestId,
    syncQuestProgress,
  ]);

  useEffect(() => {
    if (auth.session) {
      if (pendingActionRef.current) {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        setShowAuthDialog(false);
        setAuthFeedback(null);
        setAuthEmail('');
        setAuthPassword('');
        action();
      } else {
        setShowAuthDialog(false);
        setAuthFeedback(null);
      }
    } else {
      pendingActionRef.current = null;
    }
  }, [auth.session]);

  useEffect(() => {
    if (!auth.session) {
      setSelectedCharacter(null);
      setActiveQuest(null);
      setView('selector');
      setEnvironmentImageUrl(null);
      setResumeConversationId(null);
    }
  }, [auth.session]);

  // ---- Navigation helpers ----

  const handleSelectCharacter = (character: Character) => {
    requireAuth(() => {
      setSelectedCharacter(character);
      setView('conversation');
      setActiveQuest(null); // clear any quest when directly picking a character
      setActiveQuestId(null);
      setResumeConversationId(null);
      updateCharacterQueryParam(character.id, 'push');
    });
  };

  const handleSelectQuest = (quest: Quest) => {
    requireAuth(() => {
      const allCharacters = [...customCharacters, ...CHARACTERS];
      const characterForQuest = allCharacters.find((c) => c.id === quest.characterId);
      if (characterForQuest) {
        setActiveQuest(quest);
        setActiveQuestId(quest.id);
        setSelectedCharacter(characterForQuest);
        setView('conversation');
        setResumeConversationId(null);
        updateCharacterQueryParam(characterForQuest.id, 'push');
      } else {
        console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
      }
    });
  };

  const handleContinueQuest = (questId: string | undefined) => {
    if (!questId) {
      return;
    }
    const questToResume = allQuests.find((quest) => quest.id === questId);
    if (!questToResume) {
      console.warn(`Quest with ID ${questId} could not be found for continuation.`);
      return;
    }
    handleSelectQuest(questToResume);
  };

  const handleResumeConversation = (conversation: SavedConversation) => {
    requireAuth(() => {
      const allCharacters = [...customCharacters, ...CHARACTERS];
      const characterToResume = allCharacters.find((c) => c.id === conversation.characterId);

      if (!characterToResume) {
        console.error(`Unable to resume conversation: character with ID ${conversation.characterId} not found.`);
        return;
      }

      setResumeConversationId(conversation.id);
      setSelectedCharacter(characterToResume);
      setEnvironmentImageUrl(conversation.environmentImageUrl || null);

      if (conversation.questId) {
        const questToResume = allQuests.find((quest) => quest.id === conversation.questId);
        if (questToResume) {
          setActiveQuest(questToResume);
          setActiveQuestId(questToResume.id);
        } else {
          console.warn(`Quest with ID ${conversation.questId} not found while resuming conversation.`);
          setActiveQuest(null);
          setActiveQuestId(null);
        }
      } else {
        setActiveQuest(null);
        setActiveQuestId(null);
      }

      setView('conversation');

      updateCharacterQueryParam(characterToResume.id, 'push');
    });
  };

  const handleCharacterCreated = (newCharacter: Character) => {
    upsertCustomCharacter(newCharacter);
    handleSelectCharacter(newCharacter);
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      deleteCustomCharacter(characterId);
    }
  };

  const handleDeleteQuest = (questId: string) => {
    const questToDelete = customQuests.find((quest) => quest.id === questId);
    if (!questToDelete) {
      return;
    }

    const confirmed = window.confirm('Are you sure you want to permanently delete this quest? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    deleteCustomQuest(questId);
    setInProgressQuestIds((prev) => prev.filter((id) => id !== questId));
    setActiveQuest((current) => {
      if (current?.id === questId) {
        return null;
      }
      return current;
    });
  };

  const openQuestCreator = (goal?: string | null) => {
    requireAuth(() => {
      setQuestCreatorPrefill(goal ?? null);
      setView('questCreator');
    });
  };

  const handleCreateQuestFromNextSteps = (steps: string[], questTitle?: string) => {
    const trimmedSteps = steps.map((step) => step.trim()).filter(Boolean);
    if (trimmedSteps.length === 0) {
      openQuestCreator();
      return;
    }

    const bulletList = trimmedSteps.map((step) => `- ${step}`).join('\n');
    const intro = questTitle
      ? `I need a follow-up quest to improve at "${questTitle}".`
      : 'I need a new quest to improve my understanding.';
    const prefill = `${intro}\nFocus on:\n${bulletList}`;

    openQuestCreator(prefill);
  };

  // NEW: handle a freshly-generated quest & mentor from QuestCreator
  const startGeneratedQuest = (quest: Quest, mentor: Character) => {
    setQuestCreatorPrefill(null);
    upsertCustomQuest(quest);
    setActiveQuest(quest);
    setActiveQuestId(quest.id);
    setSelectedCharacter(mentor);
    setView('conversation');
    setResumeConversationId(null);
    updateCharacterQueryParam(mentor.id, 'push');
  };

  const handleQuizExit = () => {
    setQuizQuest(null);
    setQuizAssessment(null);
    setView('selector');
  };

  const handleQuizComplete = (result: QuizResult) => {
    const quest = quizQuest;
    if (quest) {
      if (result.passed) {
        markQuestCompleted(quest.id);
      } else {
        markQuestIncomplete(quest.id);
      }
    }

    persistLastQuizResult(result);
    setQuizQuest(null);
    setQuizAssessment(null);
    setView('selector');
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthFeedback('Enter both email and password.');
      return;
    }

    if (auth.authMode === 'signIn') {
      await auth.signIn(authEmail.trim(), authPassword);
      if (!auth.error) {
        setAuthFeedback(null);
      }
    } else {
      await auth.signUp(authEmail.trim(), authPassword);
      if (!auth.error) {
        setAuthFeedback('Check your inbox to confirm your account before signing in.');
      }
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setShowAuthDialog(false);
  };

  const launchQuizForQuest = (questId: string) => {
    const quest = allQuests.find((q) => q.id === questId);
    if (!quest) {
      console.warn(`Unable to launch quiz: quest with ID ${questId} not found.`);
      setView('selector');
      return;
    }

    setQuizQuest(quest);
    if (lastQuestOutcome?.questId === questId) {
      setQuizAssessment(lastQuestOutcome);
    } else {
      setQuizAssessment(null);
    }
    setView('quiz');
  };

  // ---- End conversation: summarize & (if quest) evaluate mastery ----
  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter) return;
    setIsSaving(true);
    let questAssessment: QuestAssessment | null = null;
    const questForSession = activeQuest;

    if (questForSession) {
      setQuizQuest(null);
      setQuizAssessment(null);
    }

    try {
      const conversationHistory = conversations;
      const existingConversation = conversationHistory.find((c) => c.id === sessionId);

      let updatedConversation: SavedConversation =
        existingConversation ??
        ({
          id: sessionId,
          characterId: selectedCharacter.id,
          characterName: selectedCharacter.name,
          portraitUrl: selectedCharacter.portraitUrl,
          timestamp: Date.now(),
          transcript,
          environmentImageUrl: environmentImageUrl || undefined,
        } as SavedConversation);

      updatedConversation = {
        ...updatedConversation,
        transcript,
        environmentImageUrl: environmentImageUrl || undefined,
        timestamp: Date.now(),
      };

      if (questForSession) {
        updatedConversation = {
          ...updatedConversation,
          questId: questForSession.id,
          questTitle: questForSession.title,
        };
      }

      let ai: GoogleGenAI | null = null;
      if (!process.env.API_KEY) {
        console.error('API_KEY not set, skipping summary and quest assessment.');
      } else {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      }

      // Conversation summary (skip first system/greeting turn)
      if (ai && transcript.length > 1) {
        const transcriptText = transcript
          .slice(1)
          .map((turn) => `${turn.speakerName}: ${turn.text}`)
          .join('\n\n');

        if (transcriptText.trim()) {
          const prompt = `Please summarize the following educational dialogue with ${selectedCharacter.name}. Provide a concise one-paragraph overview of the key topics discussed, and then list 3-5 of the most important takeaways or concepts as bullet points.

Dialogue:
${transcriptText}`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  overview: { type: Type.STRING, description: 'A one-paragraph overview of the conversation.' },
                  takeaways: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'A list of 3-5 key takeaways from the conversation.',
                  },
                },
                required: ['overview', 'takeaways'],
              },
            },
          });

          const summary: Summary = JSON.parse(response.text);
          updatedConversation = {
            ...updatedConversation,
            summary,
            timestamp: Date.now(),
          };
        }
      }

      // If this was a quest session, evaluate mastery
      if (ai && questForSession) {
        const questTranscriptText = transcript.map((turn) => `${turn.speakerName}: ${turn.text}`).join('\n\n');

        if (questTranscriptText.trim()) {
          const evaluationPrompt = `You are a meticulous mentor evaluating whether a student has mastered the quest "${questForSession.title}". Review the conversation transcript between the mentor and student. Determine if the student demonstrates a working understanding of the quest objective: "${questForSession.objective}".

Return a JSON object with this structure:
{
  "passed": boolean,
  "summary": string,          // one or two sentences explaining your verdict in plain language
  "evidence": string[],       // bullet-friendly phrases citing what the student said that shows understanding
  "improvements": string[]    // actionable suggestions if the student has gaps (empty if passed)
}

Focus only on the student's contributions. Mark passed=true only if the learner clearly articulates key ideas from the objective.`;

          const evaluationResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: evaluationPrompt + `\n\nTranscript:\n${questTranscriptText}`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  passed: { type: Type.BOOLEAN },
                  summary: { type: Type.STRING },
                  evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['passed', 'summary', 'evidence', 'improvements'],
              },
            },
          });

          const evaluation = JSON.parse(evaluationResponse.text);
          questAssessment = {
            questId: questForSession.id,
            questTitle: questForSession.title,
            passed: Boolean(evaluation.passed),
            summary: evaluation.summary || '',
            evidence: Array.isArray(evaluation.evidence) ? evaluation.evidence : [],
            improvements: Array.isArray(evaluation.improvements) ? evaluation.improvements : [],
          };

          updatedConversation = {
            ...updatedConversation,
            questAssessment,
          };

          if (!questAssessment.passed) {
            markQuestIncomplete(questForSession.id);
          }
        }
      } else if (questForSession) {
        // Ensure quest metadata is retained even without AI assistance.
        updatedConversation = {
          ...updatedConversation,
          questId: questForSession.id,
          questTitle: questForSession.title,
        };
      }

      upsertConversation(updatedConversation);
      syncQuestProgress();
    } catch (error) {
      console.error('Failed to finalize conversation:', error);
    } finally {
      setIsSaving(false);
      if (questAssessment) {
        setLastQuestOutcome(questAssessment);
        if (questAssessment.passed && questForSession) {
          setQuizQuest(questForSession);
          setQuizAssessment(questAssessment);
          setView('quiz');
        } else {
          setView('selector');
        }
      } else if (questForSession) {
        setLastQuestOutcome(null);
        setView('selector');
      } else {
        setView('selector');
      }
      setSelectedCharacter(null);
      setEnvironmentImageUrl(null);
      setActiveQuest(null);
      setActiveQuestId(null);
      setResumeConversationId(null);
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  // ---- View switcher ----

  const renderContent = () => {
    switch (view) {
      case 'conversation':
        return selectedCharacter ? (
          <ConversationView
            character={selectedCharacter}
            onEndConversation={handleEndConversation}
            environmentImageUrl={environmentImageUrl}
            onEnvironmentUpdate={setEnvironmentImageUrl}
            activeQuest={activeQuest}
            isSaving={isSaving} // pass saving state
            resumeConversationId={resumeConversationId}
          />
        ) : null;
      case 'history':
        return (
          <HistoryView
            onBack={() => setView('selector')}
            onResumeConversation={handleResumeConversation}
            onCreateQuestFromNextSteps={handleCreateQuestFromNextSteps}
          />
        );
      case 'creator':
        return <CharacterCreator onCharacterCreated={handleCharacterCreated} onBack={() => setView('selector')} />;
      case 'quests': {
        const allCharacters = [...customCharacters, ...CHARACTERS];
        return (
          <QuestsView
            onBack={() => setView('selector')}
            onSelectQuest={handleSelectQuest}
            quests={allQuests}
            characters={allCharacters}
            completedQuestIds={completedQuestIds}
            onCreateQuest={() => openQuestCreator()}
            inProgressQuestIds={inProgressQuestIds}
            onDeleteQuest={handleDeleteQuest}
            deletableQuestIds={customQuests.map((quest) => quest.id)}
          />
        );
      }
      case 'questCreator': {
        const allChars = [...customCharacters, ...CHARACTERS];
        const handleBack = () => {
          setQuestCreatorPrefill(null);
          setView('selector');
        };
        const handleQuestReady = (quest: Quest, character: Character) => {
          setQuestCreatorPrefill(null);
          startGeneratedQuest(quest, character);
        };
        return (
          <QuestCreator
            characters={allChars}
            onBack={handleBack}
            onQuestReady={handleQuestReady}
            onCharacterCreated={(newChar) => {
              upsertCustomCharacter(newChar);
            }}
            initialGoal={questCreatorPrefill ?? undefined}
          />
        );
      }
      case 'quiz':
        return quizQuest ? (
          <QuestQuiz
            quest={quizQuest}
            assessment={quizAssessment}
            onExit={handleQuizExit}
            onComplete={handleQuizComplete}
          />
        ) : (
          <div className="text-center text-gray-300">
            <p className="text-lg">Quiz unavailable. Returning to the hub…</p>
            <button
              type="button"
              onClick={() => setView('selector')}
              className="mt-4 inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-500"
            >
              Go back
            </button>
          </div>
        );
      case 'selector':
      default:
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
                      Math.round(
                        (completedQuestIds.length / Math.max(allQuests.length, 1)) * 100
                      )
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
                      onClick={() =>
                        handleCreateQuestFromNextSteps(
                          lastQuestOutcome.improvements,
                          lastQuestOutcome.questTitle
                        )
                      }
                      className="mt-3 inline-flex items-center text-sm font-semibold text-teal-200 border border-teal-500/60 px-3 py-1.5 rounded-md hover:bg-teal-600/20 focus:outline-none focus:ring-2 focus:ring-teal-400/60"
                    >
                      Turn next steps into a new quest
                    </button>
                  </div>
                )}

                {!lastQuestOutcome.passed && lastQuestOutcome.questId && (
                  <button
                    type="button"
                    onClick={() => handleContinueQuest(lastQuestOutcome.questId)}
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
                  Score: {lastQuizResult.correct} / {lastQuizResult.total} correct ({
                    Math.round(lastQuizResult.scoreRatio * 100)
                  }
                  %)
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
                    onClick={() => launchQuizForQuest(lastQuizResult.questId)}
                    className="rounded-lg border border-amber-500/70 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
                  >
                    {lastQuizResult.passed ? 'Retake for practice' : 'Retry quiz'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12">
              <button
                onClick={() => requireAuth(() => setView('quests'))}
                className="flex items-center gap-3 bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-8 rounded-lg transition-colors duration-300 text-lg w-full sm:w-auto"
              >
                <QuestIcon className="w-6 h-6" />
                <span>Learning Quests</span>
              </button>

              <button
                onClick={() => requireAuth(() => setView('history'))}
                className="bg-gray-700 hover:bg-gray-600 text-amber-300 font-bold py-3 px-8 rounded-lg transition-colors duration-300 border border-gray-600 w-full sm:w-auto"
              >
                View Conversation History
              </button>

              {/* NEW CTA */}
              <button
                onClick={() => openQuestCreator()}
                className="bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300 w-full sm:w-auto"
              >
                Create Your Quest
              </button>
            </div>

            <Instructions />

            <CharacterSelector
              characters={[...customCharacters, ...CHARACTERS]}
              onSelectCharacter={handleSelectCharacter}
              onStartCreation={() => requireAuth(() => setView('creator'))}
              onDeleteCharacter={handleDeleteCharacter}
            />
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen bg-[#1a1a1a]">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 z-0"
        style={{ backgroundImage: environmentImageUrl ? `url(${environmentImageUrl})` : 'none' }}
      />
      {environmentImageUrl && <div className="absolute inset-0 bg-black/50 z-0" />}

      <div
        className="relative z-10 min-h-screen flex flex-col text-gray-200 font-serif p-4 sm:p-6 lg:p-8"
        style={{ background: environmentImageUrl ? 'transparent' : 'linear-gradient(to bottom right, #1a1a1a, #2b2b2b)' }}
      >
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="text-center sm:text-left flex-1">
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider"
                style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}
              >
                School of the Ancients
              </h1>
              <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
              {isUserStateSyncing && auth.session && (
                <p className="mt-2 text-sm text-teal-300">Syncing your progress with the archive…</p>
              )}
            </div>
            <div className="flex flex-col items-center sm:items-end gap-2">
              {!auth.isConfigured ? (
                <div className="rounded-md bg-red-900/40 border border-red-600 px-4 py-2 text-sm text-red-200">
                  <p className="font-semibold">Supabase not configured</p>
                  <p className="text-red-100/80">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign in.</p>
                </div>
              ) : auth.session ? (
                <div className="flex flex-col items-center sm:items-end gap-2">
                  <span className="text-sm text-gray-300">
                    Signed in as <strong className="text-amber-200">{auth.session.user.email ?? 'Explorer'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 rounded-md border border-amber-500/70 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    disabled={auth.isLoading}
                  >
                    {auth.isLoading ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthFeedback(null);
                    setShowAuthDialog(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-amber-500/70 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {auth.isLoading ? 'Loading…' : 'Sign in'}
                </button>
              )}
              {auth.error && (
                <div className="max-w-xs text-xs text-red-300 text-center sm:text-right">
                  {auth.error}
                </div>
              )}
            </div>
          </div>
          {userStateError && auth.session && (
            <div className="mt-4 rounded-md border border-red-700 bg-red-900/40 px-4 py-2 text-sm text-red-100">
              <p className="font-semibold">Sync issue</p>
              <p>{userStateError}</p>
            </div>
          )}
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">{renderContent()}</main>

        {showAuthDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-2xl border border-amber-600/60 bg-gray-900/95 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-amber-200">
                    {auth.isConfigured
                      ? auth.authMode === 'signIn'
                        ? 'Sign in'
                        : 'Create an account'
                      : 'Authentication unavailable'}
                  </h2>
                  <p className="text-sm text-gray-300 mt-1">
                    {auth.isConfigured
                      ? auth.authMode === 'signIn'
                        ? 'Access your quests, characters, and learning progress across devices.'
                        : 'Create an account to sync your progress across every ancient archive.'
                      : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to enable sign in.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-gray-400 hover:text-amber-300"
                  onClick={() => {
                    setShowAuthDialog(false);
                    setAuthFeedback(null);
                  }}
                >
                  ✕
                </button>
              </div>

              {auth.isConfigured ? (
                <form className="mt-4 space-y-4" onSubmit={handleAuthSubmit}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200">Email</label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-amber-400 focus:outline-none"
                      placeholder="you@example.com"
                      required
                      disabled={auth.isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200">Password</label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-amber-400 focus:outline-none"
                      placeholder="••••••••"
                      required
                      disabled={auth.isLoading}
                    />
                  </div>

                  {(authFeedback || auth.error) && (
                    <div className="rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                      {auth.error ? auth.error : authFeedback}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <button
                      type="button"
                      className="text-sm text-amber-300 hover:text-amber-200"
                      onClick={() => {
                        auth.setAuthMode(auth.authMode === 'signIn' ? 'signUp' : 'signIn');
                        setAuthFeedback(null);
                      }}
                    >
                      {auth.authMode === 'signIn'
                        ? 'Need an account? Switch to sign up.'
                        : 'Already have an account? Switch to sign in.'}
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-md border border-gray-500 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/70"
                        onClick={() => {
                          setShowAuthDialog(false);
                          setAuthFeedback(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-70"
                        disabled={auth.isLoading}
                      >
                        {auth.isLoading
                          ? auth.authMode === 'signIn'
                            ? 'Signing in…'
                            : 'Creating account…'
                          : auth.authMode === 'signIn'
                            ? 'Sign in'
                            : 'Sign up'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mt-4 text-sm text-amber-100">
                  <p>Once Supabase credentials are configured, you can sign in to sync your learning progress.</p>
                  <button
                    type="button"
                    className="mt-4 rounded-md border border-amber-500/70 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/10"
                    onClick={() => setShowAuthDialog(false)}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const auth = useSupabaseAuth();

  return (
    <UserDataProvider userId={auth.session?.user.id ?? null}>
      <AppShell auth={auth} />
    </UserDataProvider>
  );
};

export default App;
