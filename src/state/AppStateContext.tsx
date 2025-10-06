import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { GoogleGenAI, Type } from '@google/genai';

import type {
  Character,
  ConversationTurn,
  Quest,
  QuestAssessment,
  QuizResult,
  SavedConversation,
} from '../types';
import { CHARACTERS, QUESTS } from '../constants';
import {
  createConversationRecord,
  findConversationById,
  loadActiveQuestId,
  loadCompletedQuests,
  loadConversations,
  loadCustomCharacters,
  loadCustomQuests,
  loadLastQuizResult,
  saveActiveQuestId,
  saveCompletedQuests,
  saveConversation,
  saveCustomCharacters,
  saveCustomQuests,
  saveLastQuizResult,
} from '../lib/storage';

interface FinalizeConversationResult {
  next: 'home' | 'quiz';
  questId?: string;
}

interface AppStateValue {
  characters: Character[];
  customCharacters: Character[];
  addCustomCharacter: (character: Character) => void;
  deleteCustomCharacter: (id: string) => void;
  selectCharacter: (character: Character) => void;
  selectedCharacter: Character | null;
  setEnvironmentImageUrl: (url: string | null) => void;
  environmentImageUrl: string | null;
  resumeConversationId: string | null;
  setResumeConversationId: (id: string | null) => void;
  resumeConversation: (conversation: SavedConversation) => void;
  activeQuest: Quest | null;
  selectQuest: (quest: Quest) => void;
  quests: Quest[];
  customQuests: Quest[];
  deleteQuest: (questId: string) => void;
  inProgressQuestIds: string[];
  syncQuestProgress: () => void;
  completedQuestIds: string[];
  completedQuestCount: number;
  setQuestCreatorPrefill: (goal: string | null) => void;
  questCreatorPrefill: string | null;
  startGeneratedQuest: (quest: Quest, character: Character) => void;
  handleCreateQuestFromNextSteps: (steps: string[], questTitle?: string) => void;
  isSaving: boolean;
  finalizeConversation: (transcript: ConversationTurn[], sessionId: string) => Promise<FinalizeConversationResult>;
  lastQuestOutcome: QuestAssessment | null;
  setLastQuestOutcome: (assessment: QuestAssessment | null) => void;
  pendingQuizQuest: Quest | null;
  pendingQuizAssessment: QuestAssessment | null;
  clearPendingQuiz: () => void;
  lastQuizResult: QuizResult | null;
  setLastQuizResult: (result: QuizResult | null) => void;
  handleQuizComplete: (result: QuizResult) => void;
  handleQuizExit: () => void;
  launchQuizForQuest: (questId: string) => void;
  lastQuizQuest: Quest | null;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [customQuests, setCustomQuests] = useState<Quest[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [inProgressQuestIds, setInProgressQuestIds] = useState<string[]>([]);
  const [questCreatorPrefill, setQuestCreatorPrefill] = useState<string | null>(null);
  const [pendingQuizQuest, setPendingQuizQuest] = useState<Quest | null>(null);
  const [pendingQuizAssessment, setPendingQuizAssessment] = useState<QuestAssessment | null>(null);
  const [lastQuizResult, setLastQuizResultState] = useState<QuizResult | null>(null);

  const characters = useMemo(() => [...customCharacters, ...CHARACTERS], [customCharacters]);
  const quests = useMemo(() => [...customQuests, ...QUESTS], [customQuests]);

  const lastQuizQuest = useMemo(() => {
    if (!lastQuizResult) {
      return null;
    }
    return quests.find((quest) => quest.id === lastQuizResult.questId) ?? null;
  }, [lastQuizResult, quests]);

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

  useEffect(() => {
    const storedCharacters = loadCustomCharacters();
    if (storedCharacters.length > 0) {
      setCustomCharacters(storedCharacters);
    }

    const storedQuests = loadCustomQuests();
    if (storedQuests.length > 0) {
      setCustomQuests(storedQuests);
    }

    setCompletedQuestIds(loadCompletedQuests());
    const storedQuizResult = loadLastQuizResult();
    if (storedQuizResult) {
      setLastQuizResultState(storedQuizResult);
    }

    const allCharacters = [...storedCharacters, ...CHARACTERS];
    const availableQuests = [...storedQuests, ...QUESTS];

    const storedActiveQuestId = loadActiveQuestId();
    if (storedActiveQuestId) {
      const storedQuest = availableQuests.find((quest) => quest.id === storedActiveQuestId) || null;
      if (storedQuest) {
        setActiveQuest(storedQuest);
        const questCharacter = allCharacters.find((character) => character.id === storedQuest.characterId) || null;
        if (questCharacter) {
          setSelectedCharacter(questCharacter);
        } else {
          console.warn(`Character with ID ${storedQuest.characterId} not found for stored active quest.`);
          saveActiveQuestId(null);
        }
      } else {
        saveActiveQuestId(null);
      }
    }

    syncQuestProgress();
  }, [syncQuestProgress]);

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

    setCompletedQuestIds((prev) => {
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

  const addCustomCharacter = useCallback((character: Character) => {
    setCustomCharacters((prev) => {
      const updated = [character, ...prev];
      saveCustomCharacters(updated);
      return updated;
    });
  }, []);

  const deleteCustomCharacter = useCallback((id: string) => {
    setCustomCharacters((prev) => {
      const updated = prev.filter((character) => character.id !== id);
      saveCustomCharacters(updated);
      return updated;
    });
  }, []);

  const selectCharacter = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setActiveQuest(null);
    saveActiveQuestId(null);
    setResumeConversationId(null);
  }, []);

  const selectQuest = useCallback(
    (quest: Quest) => {
      const questCharacter = characters.find((character) => character.id === quest.characterId);
      if (questCharacter) {
        setActiveQuest(quest);
        saveActiveQuestId(quest.id);
        setSelectedCharacter(questCharacter);
        setResumeConversationId(null);
      } else {
        console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
      }
    },
    [characters],
  );

  const resumeConversation = useCallback(
    (conversation: SavedConversation) => {
      const allCharacters = [...customCharacters, ...CHARACTERS];
      const characterToResume = allCharacters.find((character) => character.id === conversation.characterId);

      if (!characterToResume) {
        console.error(`Unable to resume conversation: character with ID ${conversation.characterId} not found.`);
        return;
      }

      setResumeConversationId(conversation.id);
      setSelectedCharacter(characterToResume);
      setEnvironmentImageUrl(conversation.environmentImageUrl || null);

      if (conversation.questId) {
        const questToResume = quests.find((quest) => quest.id === conversation.questId);
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
    },
    [customCharacters, quests],
  );

  const deleteQuest = useCallback(
    (questId: string) => {
      const questToDelete = customQuests.find((quest) => quest.id === questId);
      if (!questToDelete) {
        return;
      }

      setCustomQuests((prev) => {
        const updated = prev.filter((quest) => quest.id !== questId);
        saveCustomQuests(updated);
        return updated;
      });

      setCompletedQuestIds((prev) => {
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
    },
    [customQuests],
  );

  const handleCreateQuestFromNextSteps = useCallback(
    (steps: string[], questTitle?: string) => {
      const trimmedSteps = steps.map((step) => step.trim()).filter(Boolean);
      if (trimmedSteps.length === 0) {
        setQuestCreatorPrefill(null);
        return;
      }

      const bulletList = trimmedSteps.map((step) => `- ${step}`).join('\n');
      const intro = questTitle
        ? `I need a follow-up quest to improve at "${questTitle}".`
        : 'I need a new quest to improve my understanding.';
      const prefill = `${intro}\nFocus on:\n${bulletList}`;

      setQuestCreatorPrefill(prefill);
    },
    [],
  );

  const startGeneratedQuest = useCallback(
    (quest: Quest, mentor: Character) => {
      setQuestCreatorPrefill(null);
      setCustomQuests((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === quest.id);
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
      setResumeConversationId(null);
    },
    [],
  );

  const clearPendingQuiz = useCallback(() => {
    setPendingQuizQuest(null);
    setPendingQuizAssessment(null);
  }, []);

  const setLastQuizResult = useCallback((result: QuizResult | null) => {
    setLastQuizResultState(result);
    saveLastQuizResult(result);
  }, []);

  const handleQuizComplete = useCallback(
    (result: QuizResult) => {
      const quest = quests.find((item) => item.id === result.questId);
      if (quest) {
        if (result.passed) {
          setCompletedQuestIds((prev) => {
            if (prev.includes(quest.id)) {
              saveCompletedQuests(prev);
              return prev;
            }
            const updated = [...prev, quest.id];
            saveCompletedQuests(updated);
            return updated;
          });
        } else {
          setCompletedQuestIds((prev) => {
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
      clearPendingQuiz();
    },
    [quests, clearPendingQuiz, setLastQuizResult],
  );

  const handleQuizExit = useCallback(() => {
    clearPendingQuiz();
  }, [clearPendingQuiz]);

  const launchQuizForQuest = useCallback(
    (questId: string) => {
      const quest = quests.find((item) => item.id === questId);
      if (!quest) {
        console.warn(`Unable to launch quiz: quest with ID ${questId} not found.`);
        return;
      }

      setPendingQuizQuest(quest);
      if (lastQuestOutcome?.questId === questId) {
        setPendingQuizAssessment(lastQuestOutcome);
      } else {
        setPendingQuizAssessment(null);
      }
    },
    [quests, lastQuestOutcome],
  );

  const finalizeConversation = useCallback(
    async (transcript: ConversationTurn[], sessionId: string): Promise<FinalizeConversationResult> => {
      if (!selectedCharacter) {
        return { next: 'home' };
      }
      setIsSaving(true);
      let questAssessment: QuestAssessment | null = null;
      const questForSession = activeQuest;

      if (questForSession) {
        setPendingQuizQuest(null);
        setPendingQuizAssessment(null);
      }

      try {
        const existingConversation = findConversationById(sessionId);

        let updatedConversation: SavedConversation =
          existingConversation ??
          createConversationRecord({
            id: sessionId,
            characterId: selectedCharacter.id,
            characterName: selectedCharacter.name,
            portraitUrl: selectedCharacter.portraitUrl,
            transcript,
            environmentImageUrl: environmentImageUrl || undefined,
          });

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

        if (ai && transcript.length > 1) {
          const transcriptText = transcript
            .slice(1)
            .map((turn) => `${turn.speakerName}: ${turn.text}`)
            .join('\n\n');

          if (transcriptText.trim()) {
            const prompt = `Please summarize the following educational dialogue with ${selectedCharacter.name}. Provide a concise one-paragraph overview of the key topics discussed, and then list 3-5 of the most important takeaways or concepts as bullet points.\n\nDialogue:\n${transcriptText}`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    overview: { type: Type.STRING },
                    takeaways: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['overview', 'takeaways'],
                },
              },
            });

            const summary = JSON.parse(response.text) as SavedConversation['summary'];
            updatedConversation = {
              ...updatedConversation,
              summary,
              timestamp: Date.now(),
            };
          }
        }

        if (ai && questForSession) {
          const questTranscriptText = transcript.map((turn) => `${turn.speakerName}: ${turn.text}`).join('\n\n');

          if (questTranscriptText.trim()) {
            const evaluationPrompt = `You are a meticulous mentor evaluating whether a student has mastered the quest "${questForSession.title}". Review the conversation transcript between the mentor and student. Determine if the student demonstrates a working understanding of the quest objective: "${questForSession.objective}".\n\nReturn a JSON object with this structure:\n{\n  "passed": boolean,\n  "summary": string,\n  "evidence": string[],\n  "improvements": string[]\n}\n\nFocus only on the student's contributions. Mark passed=true only if the learner clearly articulates key ideas from the objective.`;

            const evaluationResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `${evaluationPrompt}\n\nTranscript:\n${questTranscriptText}`,
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
              setCompletedQuestIds((prev) => {
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
          updatedConversation = {
            ...updatedConversation,
            questId: questForSession.id,
            questTitle: questForSession.title,
          };
        }

        saveConversation(updatedConversation);
        syncQuestProgress();

        if (questAssessment) {
          setLastQuestOutcome(questAssessment);
          if (questAssessment.passed && questForSession) {
            setPendingQuizQuest(questForSession);
            setPendingQuizAssessment(questAssessment);
          }
        } else if (questForSession) {
          setLastQuestOutcome(null);
        }
      } catch (error) {
        console.error('Failed to finalize conversation:', error);
      } finally {
        setIsSaving(false);
        setSelectedCharacter(null);
        setEnvironmentImageUrl(null);
        setActiveQuest(null);
        saveActiveQuestId(null);
        setResumeConversationId(null);
      }

      if (questAssessment?.passed && questForSession) {
        return { next: 'quiz', questId: questForSession.id };
      }

      return { next: 'home' };
    },
    [activeQuest, environmentImageUrl, selectedCharacter, syncQuestProgress],
  );

  const value = useMemo<AppStateValue>(
    () => ({
      characters,
      customCharacters,
      addCustomCharacter,
      deleteCustomCharacter,
      selectCharacter,
      selectedCharacter,
      setEnvironmentImageUrl,
      environmentImageUrl,
      resumeConversationId,
      setResumeConversationId,
      resumeConversation,
      activeQuest,
      selectQuest,
      quests,
      customQuests,
      deleteQuest,
      inProgressQuestIds,
      syncQuestProgress,
      completedQuestIds,
      completedQuestCount: completedQuestIds.length,
      setQuestCreatorPrefill,
      questCreatorPrefill,
      startGeneratedQuest,
      handleCreateQuestFromNextSteps,
      isSaving,
      finalizeConversation,
      lastQuestOutcome,
      setLastQuestOutcome,
      pendingQuizQuest,
      pendingQuizAssessment,
      clearPendingQuiz,
      lastQuizResult,
      setLastQuizResult,
      handleQuizComplete,
      handleQuizExit,
      launchQuizForQuest,
      lastQuizQuest,
    }),
    [
      characters,
      customCharacters,
      addCustomCharacter,
      deleteCustomCharacter,
      selectCharacter,
      selectedCharacter,
      environmentImageUrl,
      resumeConversationId,
      setResumeConversationId,
      resumeConversation,
      activeQuest,
      selectQuest,
      quests,
      customQuests,
      deleteQuest,
      inProgressQuestIds,
      syncQuestProgress,
      completedQuestIds,
      setQuestCreatorPrefill,
      questCreatorPrefill,
      startGeneratedQuest,
      handleCreateQuestFromNextSteps,
      isSaving,
      finalizeConversation,
      lastQuestOutcome,
      pendingQuizQuest,
      pendingQuizAssessment,
      clearPendingQuiz,
      lastQuizResult,
      setLastQuizResult,
      handleQuizComplete,
      handleQuizExit,
      launchQuizForQuest,
      lastQuizQuest,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
