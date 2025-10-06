import React from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { CHARACTERS, QUESTS } from '../../constants';
import type {
  Character,
  ConversationTurn,
  Quest,
  QuestAssessment,
  QuizResult,
  SavedConversation,
  Summary,
} from '../../types';
import {
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
  transcriptToText,
} from '../lib/storage';

interface FinalizeConversationResult {
  next: 'selector' | 'quiz';
  questId?: string;
}

interface AppStateValue {
  characters: Character[];
  customCharacters: Character[];
  customQuests: Quest[];
  quests: Quest[];
  selectedCharacter: Character | null;
  activeQuest: Quest | null;
  resumeConversationId: string | null;
  environmentImageUrl: string | null;
  isSaving: boolean;
  completedQuests: string[];
  inProgressQuestIds: string[];
  lastQuestOutcome: QuestAssessment | null;
  lastQuizResult: QuizResult | null;
  questCreatorPrefill: string | null;
  pendingQuizAssessment: QuestAssessment | null;
  beginConversationWithCharacter: (character: Character) => void;
  beginQuestConversation: (quest: Quest) => Character | null;
  continueQuest: (questId: string) => Quest | null;
  resumeConversation: (conversation: SavedConversation) => Character | null;
  addCustomCharacter: (character: Character) => void;
  deleteCustomCharacter: (characterId: string) => void;
  deleteQuest: (questId: string) => void;
  setEnvironmentImageUrl: (url: string | null) => void;
  setResumeConversationId: (id: string | null) => void;
  finalizeConversation: (transcript: ConversationTurn[], sessionId: string) => Promise<FinalizeConversationResult>;
  launchQuizForQuest: (questId: string) => Quest | null;
  completeQuiz: (result: QuizResult) => void;
  exitQuiz: () => void;
  setQuestCreatorPrefill: (value: string | null) => void;
  prefillQuestFromNextSteps: (steps: string[], questTitle?: string) => void;
  startGeneratedQuest: (quest: Quest, mentor: Character) => void;
  syncQuestProgress: () => void;
}

const AppStateContext = React.createContext<AppStateValue | undefined>(undefined);

const useProvideAppState = (): AppStateValue => {
  const [customCharacters, setCustomCharacters] = React.useState<Character[]>([]);
  const [customQuests, setCustomQuests] = React.useState<Quest[]>([]);
  const [selectedCharacter, setSelectedCharacter] = React.useState<Character | null>(null);
  const [environmentImageUrl, setEnvironmentImageUrl] = React.useState<string | null>(null);
  const [activeQuest, setActiveQuest] = React.useState<Quest | null>(null);
  const [resumeConversationId, setResumeConversationId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [completedQuests, setCompletedQuests] = React.useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = React.useState<QuestAssessment | null>(null);
  const [inProgressQuestIds, setInProgressQuestIds] = React.useState<string[]>([]);
  const [questCreatorPrefill, setQuestCreatorPrefill] = React.useState<string | null>(null);
  const [pendingQuizAssessment, setPendingQuizAssessment] = React.useState<QuestAssessment | null>(null);
  const [lastQuizResult, setLastQuizResult] = React.useState<QuizResult | null>(null);

  const characters = React.useMemo(() => [...customCharacters, ...CHARACTERS], [customCharacters]);
  const quests = React.useMemo(() => [...customQuests, ...QUESTS], [customQuests]);

  const syncQuestProgress = React.useCallback(() => {
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

  React.useEffect(() => {
    const loadedCharacters = loadCustomCharacters();
    if (loadedCharacters.length > 0) {
      setCustomCharacters(loadedCharacters);
    }

    const loadedQuests = loadCustomQuests();
    if (loadedQuests.length > 0) {
      setCustomQuests(loadedQuests);
    }

    const availableQuests = [...loadedQuests, ...QUESTS];
    const storedActiveQuestId = loadActiveQuestId();
    if (storedActiveQuestId) {
      const storedQuest = availableQuests.find((quest) => quest.id === storedActiveQuestId) || null;
      if (storedQuest) {
        setActiveQuest(storedQuest);
      } else {
        saveActiveQuestId(null);
      }
    }

    setCompletedQuests(loadCompletedQuests());
    const storedQuizResult = loadLastQuizResult();
    if (storedQuizResult) {
      setLastQuizResult(storedQuizResult);
    }
    syncQuestProgress();
  }, [syncQuestProgress]);

  React.useEffect(() => {
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

  const beginConversationWithCharacter = React.useCallback((character: Character) => {
    setSelectedCharacter(character);
    setActiveQuest(null);
    saveActiveQuestId(null);
    setResumeConversationId(null);
  }, []);

  const beginQuestConversation = React.useCallback(
    (quest: Quest) => {
      const character = characters.find((c) => c.id === quest.characterId) || null;
      if (!character) {
        console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
        return null;
      }
      setActiveQuest(quest);
      saveActiveQuestId(quest.id);
      setSelectedCharacter(character);
      setResumeConversationId(null);
      return character;
    },
    [characters],
  );

  const continueQuest = React.useCallback(
    (questId: string) => {
      const quest = quests.find((q) => q.id === questId) || null;
      if (!quest) {
        console.warn(`Quest with ID ${questId} could not be found for continuation.`);
        return null;
      }
      beginQuestConversation(quest);
      return quest;
    },
    [beginQuestConversation, quests],
  );

  const resumeConversation = React.useCallback(
    (conversation: SavedConversation) => {
      const character = characters.find((c) => c.id === conversation.characterId) || null;
      if (!character) {
        console.error(`Unable to resume conversation: character with ID ${conversation.characterId} not found.`);
        return null;
      }

      setResumeConversationId(conversation.id);
      setSelectedCharacter(character);
      setEnvironmentImageUrl(conversation.environmentImageUrl || null);

      if (conversation.questId) {
        const questToResume = quests.find((quest) => quest.id === conversation.questId) || null;
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

      return character;
    },
    [characters, quests],
  );

  const addCustomCharacter = React.useCallback((character: Character) => {
    setCustomCharacters((prev) => {
      const updated = [character, ...prev];
      saveCustomCharacters(updated);
      return updated;
    });
  }, []);

  const deleteCustomCharacter = React.useCallback((characterId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      setCustomCharacters((prev) => {
        const updated = prev.filter((character) => character.id !== characterId);
        saveCustomCharacters(updated);
        return updated;
      });
    }
  }, []);

  const deleteQuest = React.useCallback((questId: string) => {
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
  }, [customQuests]);

  const prefillQuestFromNextSteps = React.useCallback((steps: string[], questTitle?: string) => {
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
  }, []);

  const startGeneratedQuest = React.useCallback(
    (quest: Quest, mentor: Character) => {
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
      setResumeConversationId(null);
    },
    [],
  );

  const launchQuizForQuest = React.useCallback(
    (questId: string) => {
      const quest = quests.find((q) => q.id === questId) || null;
      if (!quest) {
        console.warn(`Unable to launch quiz: quest with ID ${questId} not found.`);
        return null;
      }
      if (lastQuestOutcome?.questId === questId) {
        setPendingQuizAssessment(lastQuestOutcome);
      } else {
        setPendingQuizAssessment(null);
      }
      return quest;
    },
    [lastQuestOutcome, quests],
  );

  const completeQuiz = React.useCallback(
    (result: QuizResult) => {
      const quest = quests.find((q) => q.id === result.questId) || null;
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
      setPendingQuizAssessment(null);
    },
    [quests],
  );

  const exitQuiz = React.useCallback(() => {
    setPendingQuizAssessment(null);
  }, []);

  const finalizeConversation = React.useCallback(
    async (transcript: ConversationTurn[], sessionId: string): Promise<FinalizeConversationResult> => {
      if (!selectedCharacter) {
        return { next: 'selector' };
      }

      setIsSaving(true);
      let questAssessment: QuestAssessment | null = null;
      const questForSession = activeQuest;

      if (questForSession) {
        setPendingQuizAssessment(null);
      }

      try {
        const conversationHistory = loadConversations();
        const existingConversation = conversationHistory.find((c) => c.id === sessionId);

        let updatedConversation: SavedConversation =
          existingConversation ?? {
            id: sessionId,
            characterId: selectedCharacter.id,
            characterName: selectedCharacter.name,
            portraitUrl: selectedCharacter.portraitUrl,
            timestamp: Date.now(),
            transcript,
            environmentImageUrl: environmentImageUrl || undefined,
          };

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

        if (ai && questForSession) {
          const questTranscriptText = transcriptToText(transcript);

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

            if (questAssessment.passed) {
              // Quiz completion will finalize status.
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
          updatedConversation = {
            ...updatedConversation,
            questId: questForSession.id,
            questTitle: questForSession.title,
          };
        }

        saveConversation(updatedConversation);
        syncQuestProgress();
      } catch (error) {
        console.error('Failed to finalize conversation:', error);
      } finally {
        setIsSaving(false);
      }

      let next: FinalizeConversationResult = { next: 'selector' };
      if (questAssessment) {
        setLastQuestOutcome(questAssessment);
        if (questAssessment.passed && activeQuest) {
          setPendingQuizAssessment(questAssessment);
          next = { next: 'quiz', questId: activeQuest.id };
        }
      } else if (activeQuest) {
        setLastQuestOutcome(null);
      }

      setSelectedCharacter(null);
      setEnvironmentImageUrl(null);
      setActiveQuest(null);
      saveActiveQuestId(null);
      setResumeConversationId(null);

      return next;
    },
    [activeQuest, environmentImageUrl, selectedCharacter, syncQuestProgress],
  );

  const value = React.useMemo<AppStateValue>(
    () => ({
      characters,
      customCharacters,
      customQuests,
      quests,
      selectedCharacter,
      activeQuest,
      resumeConversationId,
      environmentImageUrl,
      isSaving,
      completedQuests,
      inProgressQuestIds,
      lastQuestOutcome,
      lastQuizResult,
      questCreatorPrefill,
      pendingQuizAssessment,
      beginConversationWithCharacter,
      beginQuestConversation,
      continueQuest,
      resumeConversation,
      addCustomCharacter,
      deleteCustomCharacter,
      deleteQuest,
      setEnvironmentImageUrl,
      setResumeConversationId,
      finalizeConversation,
      launchQuizForQuest,
      completeQuiz,
      exitQuiz,
      setQuestCreatorPrefill,
      prefillQuestFromNextSteps,
      startGeneratedQuest,
      syncQuestProgress,
    }),
    [
      characters,
      customCharacters,
      customQuests,
      quests,
      selectedCharacter,
      activeQuest,
      resumeConversationId,
      environmentImageUrl,
      isSaving,
      completedQuests,
      inProgressQuestIds,
      lastQuestOutcome,
      lastQuizResult,
      questCreatorPrefill,
      pendingQuizAssessment,
      beginConversationWithCharacter,
      beginQuestConversation,
      continueQuest,
      resumeConversation,
      addCustomCharacter,
      deleteCustomCharacter,
      deleteQuest,
      finalizeConversation,
      launchQuizForQuest,
      completeQuiz,
      exitQuiz,
      prefillQuestFromNextSteps,
      startGeneratedQuest,
      syncQuestProgress,
    ],
  );

  return value;
};

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useProvideAppState();
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = (): AppStateValue => {
  const context = React.useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
