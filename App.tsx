import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const CUSTOM_CHARACTERS_KEY = 'school-of-the-ancients-custom-characters';
const HISTORY_KEY = 'school-of-the-ancients-history';
const COMPLETED_QUESTS_KEY = 'school-of-the-ancients-completed-quests';
const CUSTOM_QUESTS_KEY = 'school-of-the-ancients-custom-quests';
const ACTIVE_QUEST_KEY = 'school-of-the-ancients-active-quest-id';
const LAST_QUIZ_RESULT_KEY = 'school-of-the-ancients-last-quiz-result';
const API_KEY_STORAGE_KEY = 'school-of-the-ancients-api-key';

// ---- Local storage helpers -------------------------------------------------

const loadConversations = (): SavedConversation[] => {
  try {
    const rawHistory = localStorage.getItem(HISTORY_KEY);
    return rawHistory ? JSON.parse(rawHistory) : [];
  } catch (error) {
    console.error('Failed to load conversation history:', error);
    return [];
  }
};

const saveConversationToLocalStorage = (conversation: SavedConversation) => {
  try {
    const history = loadConversations();
    const existingIndex = history.findIndex((c) => c.id === conversation.id);
    if (existingIndex > -1) {
      history[existingIndex] = conversation;
    } else {
      history.unshift(conversation);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
};

const loadCompletedQuests = (): string[] => {
  try {
    const stored = localStorage.getItem(COMPLETED_QUESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load completed quests:', error);
    return [];
  }
};

const saveCompletedQuests = (questIds: string[]) => {
  try {
    localStorage.setItem(COMPLETED_QUESTS_KEY, JSON.stringify(questIds));
  } catch (error) {
    console.error('Failed to save completed quests:', error);
  }
};

const loadCustomQuests = (): Quest[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_QUESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load custom quests:', error);
    return [];
  }
};

const saveCustomQuests = (quests: Quest[]) => {
  try {
    localStorage.setItem(CUSTOM_QUESTS_KEY, JSON.stringify(quests));
  } catch (error) {
    console.error('Failed to save custom quests:', error);
  }
};

const loadLastQuizResult = (): QuizResult | null => {
  try {
    const stored = localStorage.getItem(LAST_QUIZ_RESULT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load last quiz result:', error);
    return null;
  }
};

const saveLastQuizResult = (result: QuizResult | null) => {
  try {
    if (result) {
      localStorage.setItem(LAST_QUIZ_RESULT_KEY, JSON.stringify(result));
    } else {
      localStorage.removeItem(LAST_QUIZ_RESULT_KEY);
    }
  } catch (error) {
    console.error('Failed to persist last quiz result:', error);
  }
};

const loadActiveQuestId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_QUEST_KEY);
  } catch (error) {
    console.error('Failed to load active quest:', error);
    return null;
  }
};

const saveActiveQuestId = (questId: string | null) => {
  try {
    if (questId) {
      localStorage.setItem(ACTIVE_QUEST_KEY, questId);
    } else {
      localStorage.removeItem(ACTIVE_QUEST_KEY);
    }
  } catch (error) {
    console.error('Failed to persist active quest:', error);
  }
};

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

const App: React.FC = () => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<
    'selector' | 'conversation' | 'history' | 'creator' | 'quests' | 'questCreator' | 'quiz'
  >('selector');

  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [customQuests, setCustomQuests] = useState<Quest[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<string | null>(null);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);

  // end-conversation save/AI-eval flag
  const [isSaving, setIsSaving] = useState(false);

  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [inProgressQuestIds, setInProgressQuestIds] = useState<string[]>([]);
  const [questCreatorPrefill, setQuestCreatorPrefill] = useState<string | null>(null);
  const [quizQuest, setQuizQuest] = useState<Quest | null>(null);
  const [quizAssessment, setQuizAssessment] = useState<QuestAssessment | null>(null);
  const [lastQuizResult, setLastQuizResult] = useState<QuizResult | null>(null);

  const allQuests = useMemo(() => [...customQuests, ...QUESTS], [customQuests]);
  const lastQuizQuest = useMemo(() => {
    if (!lastQuizResult) {
      return null;
    }
    return allQuests.find((quest) => quest.id === lastQuizResult.questId) ?? null;
  }, [allQuests, lastQuizResult]);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (storedKey) {
        setApiKey(storedKey);
        setApiKeyInput(storedKey);
      }
    } catch (error) {
      console.error('Failed to load saved API key:', error);
    }
  }, []);

  useEffect(() => {
    try {
      if (apiKey) {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to persist API key:', error);
    }
  }, [apiKey]);

  const handleSaveApiKey = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setApiKey(null);
      setApiKeyStatus('API key cleared. Paste a new key above to re-enable Gemini-powered features.');
      return;
    }
    setApiKey(trimmed);
    setApiKeyInput(trimmed);
    setApiKeyStatus('API key saved to this browser. It is never sent to our servers.');
  };

  const handleClearApiKey = () => {
    setApiKey(null);
    setApiKeyInput('');
    setApiKeyStatus('API key removed. Paste a new key above to continue.');
  };

  const isApiKeyReady = Boolean(apiKey);

  useEffect(() => {
    if (customQuests.length === 0) {
      return;
    }

    const availableCharacterIds = new Set([
      ...customCharacters.map((character) => character.id),
      ...CHARACTERS.map((character) => character.id),
    ]);

    const removedQuestIds: string[] = [];
    const validQuests = customQuests.filter((quest) => {
      const isValid = availableCharacterIds.has(quest.characterId);
      if (!isValid) {
        removedQuestIds.push(quest.id);
      }
      return isValid;
    });

    if (removedQuestIds.length === 0) {
      return;
    }

    setCustomQuests(validQuests);
    saveCustomQuests(validQuests);

    setCompletedQuests((prev) => {
      const updated = prev.filter((id) => !removedQuestIds.includes(id));
      if (updated.length !== prev.length) {
        saveCompletedQuests(updated);
        return updated;
      }
      return prev;
    });

    setInProgressQuestIds((prev) => prev.filter((id) => !removedQuestIds.includes(id)));

    setActiveQuest((current) => {
      if (current && removedQuestIds.includes(current.id)) {
        saveActiveQuestId(null);
        return null;
      }
      return current;
    });
  }, [customQuests, customCharacters]);

  const syncQuestProgress = useCallback(() => {
    const history = loadConversations();
    const inProgress = new Set<string>();
    history.forEach((conversation) => {
      if (!conversation.questId) return;
      if (conversation.questAssessment?.passed) return;
      if (conversation.transcript && conversation.transcript.length > 1) {
        inProgress.add(conversation.questId);
      }
    });
    setInProgressQuestIds(Array.from(inProgress));
  }, []);

  // On mount: load saved characters, url param character, and progress
  useEffect(() => {
    let loadedCustomCharacters: Character[] = [];
    let loadedCustomQuests: Quest[] = [];
    try {
      const storedCharacters = localStorage.getItem(CUSTOM_CHARACTERS_KEY);
      if (storedCharacters) {
        loadedCustomCharacters = JSON.parse(storedCharacters);
        setCustomCharacters(loadedCustomCharacters);
      }
    } catch (e) {
      console.error('Failed to load custom characters:', e);
    }

    loadedCustomQuests = loadCustomQuests();
    if (loadedCustomQuests.length > 0) {
      setCustomQuests(loadedCustomQuests);
    }

    const allCharacters = [...loadedCustomCharacters, ...CHARACTERS];
    const availableQuests = [...loadedCustomQuests, ...QUESTS];

    let characterToSelect: Character | null = null;

    const storedActiveQuestId = loadActiveQuestId();
    if (storedActiveQuestId) {
      const storedQuest = availableQuests.find((quest) => quest.id === storedActiveQuestId) || null;
      if (storedQuest) {
        setActiveQuest(storedQuest);
        const questCharacter = allCharacters.find((c) => c.id === storedQuest.characterId) || null;
        if (questCharacter) {
          characterToSelect = questCharacter;
        } else {
          console.warn(`Character with ID ${storedQuest.characterId} not found for stored active quest.`);
          saveActiveQuestId(null);
        }
      } else {
        saveActiveQuestId(null);
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (!characterToSelect && characterId) {
      const characterFromUrl = allCharacters.find((c) => c.id === characterId);
      if (characterFromUrl) {
        characterToSelect = characterFromUrl;
      }
    }

    if (characterToSelect) {
      setSelectedCharacter(characterToSelect);
      setView('conversation');
      updateCharacterQueryParam(characterToSelect.id, 'replace');
    }

    setCompletedQuests(loadCompletedQuests());
    const storedQuizResult = loadLastQuizResult();
    if (storedQuizResult) {
      setLastQuizResult(storedQuizResult);
    }
    syncQuestProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncQuestProgress]);

  // ---- Navigation helpers ----

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null); // clear any quest when directly picking a character
    saveActiveQuestId(null);
    setResumeConversationId(null);
    updateCharacterQueryParam(character.id, 'push');
  };

  const handleSelectQuest = (quest: Quest) => {
    const allCharacters = [...customCharacters, ...CHARACTERS];
    const characterForQuest = allCharacters.find((c) => c.id === quest.characterId);
    if (characterForQuest) {
      setActiveQuest(quest);
      saveActiveQuestId(quest.id);
      setSelectedCharacter(characterForQuest);
      setView('conversation');
      setResumeConversationId(null);
      updateCharacterQueryParam(characterForQuest.id, 'push');
    } else {
      console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
    }
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
        saveActiveQuestId(questToResume.id);
      } else {
        console.warn(`Quest with ID ${conversation.questId} not found while resuming conversation.`);
        setActiveQuest(null);
        saveActiveQuestId(null);
      }
    } else {
      setActiveQuest(null);
      saveActiveQuestId(null);
    }

    setView('conversation');

    updateCharacterQueryParam(characterToResume.id, 'push');
  };

  const handleCharacterCreated = (newCharacter: Character) => {
    const updatedCharacters = [newCharacter, ...customCharacters];
    setCustomCharacters(updatedCharacters);
    try {
      localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updatedCharacters));
    } catch (e) {
      console.error('Failed to save custom character:', e);
    }
    handleSelectCharacter(newCharacter);
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      const updatedCharacters = customCharacters.filter((c) => c.id !== characterId);
      setCustomCharacters(updatedCharacters);
      try {
        localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updatedCharacters));
      } catch (e) {
        console.error('Failed to delete custom character:', e);
      }
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

    setCustomQuests((prev) => {
      const updated = prev.filter((quest) => quest.id !== questId);
      saveCustomQuests(updated);
      return updated;
    });

    setCompletedQuests((prev) => {
      if (!prev.includes(questId)) {
        return prev;
      }
      const updated = prev.filter((id) => id !== questId);
      saveCompletedQuests(updated);
      return updated;
    });

    setInProgressQuestIds((prev) => prev.filter((id) => id !== questId));

    setActiveQuest((current) => {
      if (current?.id === questId) {
        saveActiveQuestId(null);
        return null;
      }
      return current;
    });
  };

  const openQuestCreator = (goal?: string | null) => {
    setQuestCreatorPrefill(goal ?? null);
    setView('questCreator');
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
    setCustomQuests((prev) => {
      const existingIndex = prev.findIndex((q) => q.id === quest.id);
      let updated: Quest[];
      if (existingIndex > -1) {
        updated = [...prev];
        updated[existingIndex] = quest;
      } else {
        updated = [quest, ...prev];
      }
      saveCustomQuests(updated);
      return updated;
    });
    setActiveQuest(quest);
    saveActiveQuestId(quest.id);
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
        setCompletedQuests((prev) => {
          if (prev.includes(quest.id)) {
            saveCompletedQuests(prev);
            return prev;
          }
          const updated = [...prev, quest.id];
          saveCompletedQuests(updated);
          return updated;
        });
      } else {
        setCompletedQuests((prev) => {
          if (!prev.includes(quest.id)) {
            saveCompletedQuests(prev);
            return prev;
          }
          const updated = prev.filter((id) => id !== quest.id);
          saveCompletedQuests(updated);
          return updated;
        });
      }
    }

    setLastQuizResult(result);
    saveLastQuizResult(result);
    setQuizQuest(null);
    setQuizAssessment(null);
    setView('selector');
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
      const conversationHistory = loadConversations();
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
      if (!apiKey) {
        console.error('API key not set, skipping summary and quest assessment.');
      } else {
        ai = new GoogleGenAI({ apiKey });
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

          if (questAssessment.passed) {
            // Quiz will finalize completion status.
          } else {
            setCompletedQuests((prev) => {
              if (!prev.includes(questForSession.id)) {
                saveCompletedQuests(prev);
                return prev;
              }
              const updated = prev.filter((id) => id !== questForSession.id);
              saveCompletedQuests(updated);
              return updated;
            });
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

      saveConversationToLocalStorage(updatedConversation);
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
      saveActiveQuestId(null);
      setResumeConversationId(null);
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  // ---- View switcher ----

  const renderContent = () => {
    switch (view) {
      case 'conversation':
        return selectedCharacter ? (
          apiKey ? (
            <ConversationView
              character={selectedCharacter}
              apiKey={apiKey}
              onEndConversation={handleEndConversation}
              environmentImageUrl={environmentImageUrl}
              onEnvironmentUpdate={setEnvironmentImageUrl}
              activeQuest={activeQuest}
              isSaving={isSaving} // pass saving state
              resumeConversationId={resumeConversationId}
            />
          ) : (
            <div className="max-w-3xl mx-auto w-full bg-gray-900/70 border border-amber-500/40 rounded-xl p-8 text-center shadow-xl">
              <h2 className="text-2xl font-semibold text-amber-200">Add your Gemini API key to begin</h2>
              <p className="mt-3 text-gray-300">
                Paste your personal Gemini API key in the form above to unlock real-time conversations with {selectedCharacter.name}.
              </p>
              <button
                type="button"
                onClick={() => setView('selector')}
                className="mt-6 inline-flex items-center justify-center px-6 py-2 rounded-md border border-amber-400 text-amber-200 hover:bg-amber-500/10"
              >
                Return to character hub
              </button>
            </div>
          )
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
        return (
          <CharacterCreator
            apiKey={apiKey}
            onCharacterCreated={handleCharacterCreated}
            onBack={() => setView('selector')}
          />
        );
      case 'quests': {
        const allCharacters = [...customCharacters, ...CHARACTERS];
        return (
          <QuestsView
            onBack={() => setView('selector')}
            onSelectQuest={handleSelectQuest}
            quests={allQuests}
            characters={allCharacters}
            completedQuestIds={completedQuests}
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
              const updated = [newChar, ...customCharacters];
              setCustomCharacters(updated);
              try {
                localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updated));
              } catch {}
            }}
            initialGoal={questCreatorPrefill ?? undefined}
            apiKey={apiKey}
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
            apiKey={apiKey}
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
                {completedQuests.length} of {allQuests.length} quests completed
              </p>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (completedQuests.length / Math.max(allQuests.length, 1)) * 100
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
                onClick={() => setView('quests')}
                className="flex items-center gap-3 bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-8 rounded-lg transition-colors duration-300 text-lg w-full sm:w-auto"
              >
                <QuestIcon className="w-6 h-6" />
                <span>Learning Quests</span>
              </button>

              <button
                onClick={() => setView('history')}
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
              onStartCreation={() => setView('creator')}
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
        <header className="text-center mb-8">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider"
            style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}
          >
            School of the Ancients
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
          <div className="mt-6 max-w-3xl mx-auto w-full bg-gray-900/70 border border-amber-500/40 rounded-xl p-4 sm:p-5 shadow-lg text-left">
            <form onSubmit={handleSaveApiKey} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <label htmlFor="gemini-api-key" className="sr-only">
                  Gemini API key
                </label>
                <input
                  id="gemini-api-key"
                  type={isApiKeyVisible ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(event) => {
                    setApiKeyInput(event.target.value);
                    if (apiKeyStatus) {
                      setApiKeyStatus(null);
                    }
                  }}
                  placeholder="Paste your Gemini API key"
                  className="w-full rounded-lg border border-amber-500/40 bg-black/60 px-4 py-3 pr-24 text-base text-amber-100 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setIsApiKeyVisible((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-amber-300 hover:text-amber-200"
                >
                  {isApiKeyVisible ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex gap-2 justify-end">
                {isApiKeyReady && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="rounded-lg border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-600/20"
                  >
                    Remove
                  </button>
                )}
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
                >
                  {isApiKeyReady ? 'Update key' : 'Save key'}
                </button>
              </div>
            </form>
            <p className="mt-3 text-sm text-amber-100/80">
              Your key stays in this browser only. Every visitor supplies their own Gemini API key to chat with the ancients.
            </p>
            {apiKeyStatus && <p className="mt-2 text-sm text-emerald-300">{apiKeyStatus}</p>}
          </div>
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;

