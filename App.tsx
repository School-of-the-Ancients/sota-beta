import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Type } from '@google/genai';

import type {
  Character,
  Quest,
  ConversationTurn,
  SavedConversation,
  Summary,
  QuestAssessment,
  QuizResult,
  UserData,
} from './types';

import CharacterCreator from './components/CharacterCreator';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';

import SelectorRoute from './src/routes/Selector';
import QuestsRoute from './src/routes/Quests';
import QuestDetailRoute from './src/routes/QuestDetail';
import QuestCreatorRoute from './src/routes/QuestCreator';
import QuizRoute from './src/routes/Quiz';
import ConversationRoute from './src/routes/Conversation';
import HistoryRoute from './src/routes/History';
import ScrollToTop from './src/components/ScrollToTop';
import { links } from './src/lib/links';

import { CHARACTERS, QUESTS } from './constants';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useUserData } from './hooks/useUserData';
import { DEFAULT_USER_DATA } from './supabase/userData';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const { data: userData, loading: dataLoading, saving: dataSaving, updateData } = useUserData();

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [inProgressQuestIds, setInProgressQuestIds] = useState<string[]>([]);
  const [questCreatorPrefill, setQuestCreatorPrefill] = useState<string | null>(null);
  const [pendingQuiz, setPendingQuiz] = useState<{ questId: string; assessment: QuestAssessment | null } | null>(null);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [preferredTheme, setPreferredTheme] = useState<'system' | 'light' | 'dark'>('dark');

  const customCharacters = userData.customCharacters;
  const customQuests = userData.customQuests;
  const completedQuests = userData.completedQuestIds;
  const conversationHistory = userData.conversations;
  const lastQuizResult = userData.lastQuizResult;

  const isSaving = isSavingConversation || dataSaving;
  const isAuthenticated = Boolean(user);
  const isAppLoading = authLoading || dataLoading;

  const allCharacters = useMemo(() => [...customCharacters, ...CHARACTERS], [customCharacters]);
  const allQuests = useMemo(() => [...customQuests, ...QUESTS], [customQuests]);
  const lastQuizQuest = useMemo(() => {
    if (!lastQuizResult) {
      return null;
    }
    return allQuests.find((quest) => quest.id === lastQuizResult.questId) ?? null;
  }, [allQuests, lastQuizResult]);
  const recentConversations = useMemo(() => conversationHistory.slice(0, 5), [conversationHistory]);

  const requireAuth = useCallback(
    (message?: string) => {
      if (isAuthenticated) {
        return true;
      }

      const promptMessage = message ?? 'Sign in to continue your journey through history.';
      setAuthPrompt(promptMessage);
      setIsAuthModalOpen(true);

      return false;
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (isAuthenticated) {
      setAuthPrompt(null);
      setIsAuthModalOpen(false);
    }
  }, [isAuthenticated]);

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

    updateData((prev) => {
      const next: UserData = {
        ...prev,
        customQuests: validQuests,
        completedQuestIds: prev.completedQuestIds.filter((id) => !removedQuestIds.includes(id)),
        conversations: prev.conversations.map((conversation) => {
          if (conversation.questId && removedQuestIds.includes(conversation.questId)) {
            const { questId: _questId, questTitle: _questTitle, ...rest } = conversation;
            return {
              ...rest,
            } as SavedConversation;
          }
          return conversation;
        }),
        activeQuestId:
          prev.activeQuestId && removedQuestIds.includes(prev.activeQuestId) ? null : prev.activeQuestId,
      };
      return next;
    });

    setInProgressQuestIds((prev) => prev.filter((id) => !removedQuestIds.includes(id)));
    setActiveQuest((current) => (current && removedQuestIds.includes(current.id) ? null : current));
  }, [customQuests, customCharacters, updateData]);

  const syncQuestProgress = useCallback(() => {
    const inProgress = new Set<string>();
    conversationHistory.forEach((conversation) => {
      if (!conversation.questId) return;
      if (conversation.questAssessment?.passed) return;
      if (conversation.transcript && conversation.transcript.length > 1) {
        inProgress.add(conversation.questId);
      }
    });
    setInProgressQuestIds(Array.from(inProgress));
  }, [conversationHistory]);

  useEffect(() => {
    if (isAppLoading) {
      return;
    }

    let nextActiveQuest: Quest | null = null;
    if (userData.activeQuestId) {
      nextActiveQuest = allQuests.find((quest) => quest.id === userData.activeQuestId) ?? null;
    }

    if (nextActiveQuest) {
      setActiveQuest(nextActiveQuest);
    }

    syncQuestProgress();
  }, [allQuests, isAppLoading, syncQuestProgress, userData.activeQuestId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedCharacter(null);
      setActiveQuest(null);
      setResumeConversationId(null);
      setEnvironmentImageUrl(null);
      setPendingQuiz(null);
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, location.pathname, navigate]);

  const setActiveQuestState = useCallback(
    (quest: Quest | null) => {
      setActiveQuest(quest);
      updateData((prev) => ({
        ...prev,
        activeQuestId: quest ? quest.id : null,
      }));
    },
    [updateData],
  );

  const applyConversationContext = useCallback(
    (context: {
      character?: Character | null;
      quest?: Quest | null;
      resumeId?: string | null;
      environmentUrl?: string | null;
    }) => {
      if (context.character !== undefined) {
        setSelectedCharacter(context.character);
      }
      if (context.quest !== undefined) {
        setActiveQuestState(context.quest);
      }
      if (context.resumeId !== undefined) {
        setResumeConversationId(context.resumeId);
      }
      if (context.environmentUrl !== undefined) {
        setEnvironmentImageUrl(context.environmentUrl);
      }
    },
    [setActiveQuestState],
  );

  const handleSelectCharacter = useCallback(
    (character: Character) => {
      if (!requireAuth('Sign in to start a new conversation.')) {
        return;
      }
      applyConversationContext({ character, quest: null, resumeId: null, environmentUrl: null });
      navigate(links.conversation(character.id));
    },
    [applyConversationContext, navigate, requireAuth],
  );

  const handleSelectQuest = useCallback(
    (quest: Quest) => {
      if (!requireAuth('Sign in to embark on a quest.')) {
        return;
      }
      const characterForQuest = allCharacters.find((c) => c.id === quest.characterId);
      if (!characterForQuest) {
        console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
        return;
      }
      applyConversationContext({ character: characterForQuest, quest, resumeId: null, environmentUrl: null });
      navigate(links.conversation(characterForQuest.id));
    },
    [allCharacters, applyConversationContext, navigate, requireAuth],
  );

  const handleContinueQuest = useCallback(
    (questId: string | undefined) => {
      if (!requireAuth('Sign in to resume your quest.')) {
        return;
      }
      if (!questId) {
        return;
      }
      const questToResume = allQuests.find((quest) => quest.id === questId);
      if (!questToResume) {
        console.warn(`Quest with ID ${questId} could not be found for continuation.`);
        return;
      }
      handleSelectQuest(questToResume);
    },
    [allQuests, handleSelectQuest, requireAuth],
  );

  const handleResumeConversation = useCallback(
    (conversation: SavedConversation) => {
      if (!requireAuth('Sign in to view your saved conversations.')) {
        return;
      }
      const characterToResume = allCharacters.find((c) => c.id === conversation.characterId);

      if (!characterToResume) {
        console.error(`Unable to resume conversation: character with ID ${conversation.characterId} not found.`);
        return;
      }

      applyConversationContext({
        character: characterToResume,
        resumeId: conversation.id,
        environmentUrl: conversation.environmentImageUrl || null,
        quest: conversation.questId
          ? allQuests.find((quest) => quest.id === conversation.questId) ?? null
          : null,
      });

      navigate(
        links.conversation(characterToResume.id, {
          resumeId: conversation.id,
        }),
      );
    },
    [allCharacters, allQuests, applyConversationContext, navigate, requireAuth],
  );

  const handleConversationUpdate = useCallback(
    (conversation: SavedConversation) => {
      updateData((prev) => {
        const existingIndex = prev.conversations.findIndex((item) => item.id === conversation.id);
        const nextHistory = [...prev.conversations];
        if (existingIndex > -1) {
          nextHistory[existingIndex] = conversation;
        } else {
          nextHistory.unshift(conversation);
        }

        return {
          ...prev,
          conversations: nextHistory,
        };
      });
    },
    [updateData],
  );

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      updateData((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((conversation) => conversation.id !== conversationId),
      }));
    },
    [updateData],
  );

  const handleCharacterCreated = useCallback(
    (newCharacter: Character) => {
      if (!requireAuth('Sign in to save your custom ancient.')) {
        return;
      }
      updateData((prev) => ({
        ...prev,
        customCharacters: [newCharacter, ...prev.customCharacters],
        activeQuestId: null,
      }));
      applyConversationContext({ character: newCharacter, quest: null, resumeId: null, environmentUrl: null });
      navigate(links.conversation(newCharacter.id));
    },
    [applyConversationContext, navigate, requireAuth, updateData],
  );

  const handleDeleteCharacter = useCallback(
    (characterId: string) => {
      if (!requireAuth('Sign in to manage your roster of ancients.')) {
        return;
      }
      if (!window.confirm('Are you sure you want to permanently delete this ancient?')) {
        return;
      }

      const questsToRemove = customQuests.filter((quest) => quest.characterId === characterId).map((quest) => quest.id);

      updateData((prev) => {
        const remainingCharacters = prev.customCharacters.filter((c) => c.id !== characterId);
        const remainingQuests = prev.customQuests.filter((quest) => quest.characterId !== characterId);
        const remainingConversations = prev.conversations.filter((conversation) => conversation.characterId !== characterId);
        const remainingCompleted = prev.completedQuestIds.filter((id) => !questsToRemove.includes(id));
        const nextActiveQuestId =
          prev.activeQuestId && questsToRemove.includes(prev.activeQuestId) ? null : prev.activeQuestId;

        return {
          ...prev,
          customCharacters: remainingCharacters,
          customQuests: remainingQuests,
          completedQuestIds: remainingCompleted,
          conversations: remainingConversations,
          activeQuestId: nextActiveQuestId,
        };
      });

      setSelectedCharacter((current) => (current?.id === characterId ? null : current));
      setActiveQuest((current) => (current && current.characterId === characterId ? null : current));
    },
    [customQuests, requireAuth, updateData],
  );

  const handleDeleteQuest = useCallback(
    (questId: string) => {
      if (!requireAuth('Sign in to update your quest log.')) {
        return;
      }
      const questToDelete = customQuests.find((quest) => quest.id === questId);
      if (!questToDelete) {
        return;
      }

      const confirmed = window.confirm('Are you sure you want to permanently delete this quest? This cannot be undone.');
      if (!confirmed) {
        return;
      }

      updateData((prev) => ({
        ...prev,
        customQuests: prev.customQuests.filter((quest) => quest.id !== questId),
        completedQuestIds: prev.completedQuestIds.filter((id) => id !== questId),
        conversations: prev.conversations.map((conversation) => {
          if (conversation.questId !== questId) {
            return conversation;
          }
          const { questAssessment: _questAssessment, ...rest } = conversation;
          return {
            ...rest,
            questId: undefined,
            questTitle: undefined,
            questAssessment: undefined,
          };
        }),
        activeQuestId: prev.activeQuestId === questId ? null : prev.activeQuestId,
      }));

      setInProgressQuestIds((prev) => prev.filter((id) => id !== questId));

      setActiveQuest((current) => {
        if (current?.id === questId) {
          return null;
        }
        return current;
      });
    },
    [customQuests, requireAuth, updateData],
  );

  const openQuestCreator = useCallback(
    (goal?: string | null) => {
      if (!requireAuth('Sign in to design new quests.')) {
        return;
      }
      setQuestCreatorPrefill(goal ?? null);
      navigate('/quest/new');
    },
    [navigate, requireAuth],
  );

  const openCharacterCreatorView = useCallback(() => {
    if (!requireAuth('Sign in to create a new ancient.')) {
      return;
    }
    navigate('/characters/new');
  }, [navigate, requireAuth]);

  const handleCreateQuestFromNextSteps = useCallback(
    (steps: string[], questTitle?: string) => {
      if (!requireAuth('Sign in to turn feedback into new quests.')) {
        return;
      }
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
    },
    [openQuestCreator, requireAuth],
  );

  const startGeneratedQuest = useCallback(
    (quest: Quest, mentor: Character) => {
      if (!requireAuth('Sign in to embark on your generated quest.')) {
        return;
      }
      setQuestCreatorPrefill(null);
      updateData((prev) => {
        const existingIndex = prev.customQuests.findIndex((q) => q.id === quest.id);
        let updatedCustomQuests: Quest[];
        if (existingIndex > -1) {
          updatedCustomQuests = [...prev.customQuests];
          updatedCustomQuests[existingIndex] = quest;
        } else {
          updatedCustomQuests = [quest, ...prev.customQuests];
        }
        return {
          ...prev,
          customQuests: updatedCustomQuests,
          activeQuestId: quest.id,
        };
      });
      applyConversationContext({ character: mentor, quest, resumeId: null, environmentUrl: null });
      navigate(links.conversation(mentor.id));
    },
    [applyConversationContext, navigate, requireAuth, updateData],
  );

  const handleQuizExit = useCallback(() => {
    setPendingQuiz(null);
    navigate('/');
  }, [navigate]);

  const handleQuizComplete = useCallback(
    (result: QuizResult) => {
      if (!requireAuth('Sign in to track quiz results.')) {
        setPendingQuiz(null);
        navigate('/');
        return;
      }
      const quest = pendingQuiz ? allQuests.find((q) => q.id === pendingQuiz.questId) ?? null : null;
      updateData((prev) => {
        let updatedCompleted = [...prev.completedQuestIds];
        if (quest) {
          const alreadyCompleted = updatedCompleted.includes(quest.id);
          if (result.passed && !alreadyCompleted) {
            updatedCompleted = [...updatedCompleted, quest.id];
          }
          if (!result.passed && alreadyCompleted) {
            updatedCompleted = updatedCompleted.filter((id) => id !== quest.id);
          }
        }

        return {
          ...prev,
          completedQuestIds: updatedCompleted,
          lastQuizResult: result,
        };
      });
      setPendingQuiz(null);
      navigate('/');
    },
    [allQuests, navigate, pendingQuiz, requireAuth, updateData],
  );

  const launchQuizForQuest = useCallback(
    (questId: string) => {
      const quest = allQuests.find((q) => q.id === questId);
      if (!quest) {
        console.warn(`Unable to launch quiz: quest with ID ${questId} not found.`);
        navigate('/');
        return;
      }

      const assessment = lastQuestOutcome?.questId === questId ? lastQuestOutcome : null;
      setPendingQuiz({ questId, assessment });
      navigate(links.quiz(questId));
    },
    [allQuests, lastQuestOutcome, navigate],
  );

  const handleEndConversation = useCallback(
    async (transcript: ConversationTurn[], sessionId: string) => {
      if (!selectedCharacter) return;
      if (!requireAuth('Sign in to save your conversation.')) {
        return;
      }
      setIsSavingConversation(true);
      let questAssessment: QuestAssessment | null = null;
      const questForSession = activeQuest;

      if (questForSession) {
        setPendingQuiz(null);
      }

      try {
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
          const questTranscriptText = transcript.map((turn) => `${turn.speakerName}: ${turn.text}`).join('\n\n');

          if (questTranscriptText.trim()) {
            const evaluationPrompt = `You are a meticulous mentor evaluating whether a student has mastered the quest "${questForSession.title}". Review the conversation transcript between the mentor and student. Determine if the student demonstrates a working understanding of the quest objective: "${questForSession.objective}".\n\nReturn a JSON object with this structure:\n{\n  "passed": boolean,\n  "summary": string,          // one or two sentences explaining your verdict in plain language\n  "evidence": string[],       // bullet-friendly phrases citing what the student said that shows understanding\n  "improvements": string[]    // actionable suggestions if the student has gaps (empty if passed)\n}\n\nFocus only on the student's contributions. Mark passed=true only if the learner clearly articulates key ideas from the objective.`;

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
          }
        } else if (questForSession) {
          updatedConversation = {
            ...updatedConversation,
            questId: questForSession.id,
            questTitle: questForSession.title,
          };
        }

        updateData((prev) => {
          const existingIndex = prev.conversations.findIndex((conversation) => conversation.id === updatedConversation.id);
          const nextHistory = [...prev.conversations];
          if (existingIndex > -1) {
            nextHistory[existingIndex] = updatedConversation;
          } else {
            nextHistory.unshift(updatedConversation);
          }

          let nextCompleted = [...prev.completedQuestIds];
          if (questForSession) {
            const alreadyCompleted = nextCompleted.includes(questForSession.id);
            if (questAssessment?.passed) {
              if (!alreadyCompleted) {
                nextCompleted.push(questForSession.id);
              }
            } else if (alreadyCompleted) {
              nextCompleted = nextCompleted.filter((id) => id !== questForSession.id);
            }
          }

          return {
            ...prev,
            conversations: nextHistory,
            completedQuestIds: nextCompleted,
          };
        });

        if (questAssessment) {
          setLastQuestOutcome(questAssessment);
        } else {
          setLastQuestOutcome(null);
        }

        syncQuestProgress();
      } catch (error) {
        console.error('Failed to finalize conversation:', error);
      } finally {
        setIsSavingConversation(false);
        if (questAssessment && questForSession) {
          setPendingQuiz({ questId: questForSession.id, assessment: questAssessment });
          navigate(links.quiz(questForSession.id));
        } else {
          navigate('/');
        }
        applyConversationContext({ character: null, quest: null, resumeId: null, environmentUrl: null });
      }
    },
    [
      activeQuest,
      applyConversationContext,
      conversationHistory,
      environmentImageUrl,
      navigate,
      requireAuth,
      selectedCharacter,
      syncQuestProgress,
      updateData,
    ],
  );

  const handleSignInClick = useCallback(() => {
    if (isAuthenticated) {
      signOut().catch((error) => {
        console.error('Sign out failed', error);
        setAuthPrompt(error instanceof Error ? error.message : 'Unable to sign out.');
      });
      return;
    }

    setAuthPrompt('Sign in to personalize your ancient studies.');
    setIsAuthModalOpen(true);
  }, [isAuthenticated, signOut]);

  const handleConversationRouteHydration = useCallback(
    ({ characterId, resumeId }: { characterId: string | null; resumeId: string | null }) => {
      if (!characterId && !resumeId) {
        return { validResume: true };
      }

      let validResume = true;
      let character: Character | null = null;

      if (characterId) {
        character = allCharacters.find((item) => item.id === characterId) ?? null;
        if (character) {
          applyConversationContext({ character });
          if (!resumeId && activeQuest && activeQuest.characterId !== character.id) {
            applyConversationContext({ quest: null });
          }
        } else if (!resumeId) {
          applyConversationContext({ character: null, quest: null, resumeId: null, environmentUrl: null });
        }
      }

      if (resumeId) {
        const conversation = conversationHistory.find((item) => item.id === resumeId) ?? null;
        if (!conversation) {
          validResume = false;
          setResumeConversationId(null);
        } else {
          const resumeCharacter =
            allCharacters.find((item) => item.id === conversation.characterId) ?? character ?? null;
          if (resumeCharacter) {
            character = resumeCharacter;
            applyConversationContext({
              character: resumeCharacter,
              resumeId: conversation.id,
              environmentUrl: conversation.environmentImageUrl || null,
              quest: conversation.questId
                ? allQuests.find((quest) => quest.id === conversation.questId) ?? null
                : null,
            });
          }
        }
      } else {
        setResumeConversationId(null);
        if (character) {
          applyConversationContext({ character, environmentUrl: null });
        }
      }

      return { validResume };
    },
    [
      activeQuest,
      allCharacters,
      allQuests,
      applyConversationContext,
      conversationHistory,
      setResumeConversationId,
    ],
  );

  const openHistoryView = useCallback(() => {
    if (!requireAuth('Sign in to review your past conversations.')) {
      return;
    }
    navigate('/history');
  }, [navigate, requireAuth]);

  const openQuestsView = useCallback(() => {
    if (!requireAuth('Sign in to manage your quests.')) {
      return;
    }
    navigate('/quests');
  }, [navigate, requireAuth]);

  const openProfileView = useCallback(() => {
    if (!requireAuth('Sign in to view your explorer profile.')) {
      return;
    }
    navigate('/profile');
  }, [navigate, requireAuth]);

  const openSettingsView = useCallback(() => {
    if (!requireAuth('Sign in to update your settings.')) {
      return;
    }
    navigate('/settings');
  }, [navigate, requireAuth]);

  const currentView = useMemo(() => {
    if (location.pathname.startsWith('/quests/')) {
      return 'quests';
    }
    switch (location.pathname) {
      case '/quests':
        return 'quests';
      case '/quest/new':
        return 'questCreator';
      case '/conversation':
        return 'conversation';
      case '/history':
        return 'history';
      case '/characters/new':
        return 'creator';
      case '/profile':
        return 'profile';
      case '/settings':
        return 'settings';
      case '/quiz':
      default:
        return 'selector';
    }
  }, [location.pathname]);

  const userEmail = user?.email ?? (user?.user_metadata as { email?: string })?.email;

  return (
    <div className="relative min-h-screen bg-[#1a1a1a]">
      <ScrollToTop />
      <AuthModal
        isOpen={isAuthModalOpen && !isAuthenticated}
        prompt={authPrompt}
        onClose={() => setIsAuthModalOpen(false)}
      />
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-center sm:text-left">
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider"
                style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}
              >
                School of the Ancients
              </h1>
              <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              {userEmail && <span className="text-sm text-gray-300">Signed in as {userEmail}</span>}
              <button
                type="button"
                onClick={handleSignInClick}
                className="self-center sm:self-end inline-flex items-center gap-2 rounded-md border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
              >
                {isAuthenticated ? 'Sign out' : 'Sign in'}
              </button>
              {!isAuthenticated && authPrompt && (
                <p className="text-xs text-amber-300 max-w-xs text-center sm:text-right">{authPrompt}</p>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col lg:flex-row gap-6">
          <Sidebar
            recentConversations={recentConversations}
            onSelectConversation={handleResumeConversation}
            onCreateAncient={openCharacterCreatorView}
            onOpenHistory={openHistoryView}
            onOpenProfile={openProfileView}
            onOpenSettings={openSettingsView}
            onOpenQuests={openQuestsView}
            currentView={currentView}
            isAuthenticated={isAuthenticated}
            userEmail={userEmail}
          />
          <div className="flex-1 flex flex-col">
            <Routes>
              <Route
                path="/"
                element={
                  <SelectorRoute
                    builtInCharacters={CHARACTERS}
                    customCharacters={customCharacters}
                    allQuests={allQuests}
                    completedQuestIds={completedQuests}
                    lastQuestOutcome={lastQuestOutcome}
                    lastQuizResult={lastQuizResult}
                    lastQuizQuest={lastQuizQuest}
                    onSelectCharacter={handleSelectCharacter}
                    onStartCreation={openCharacterCreatorView}
                    onDeleteCharacter={handleDeleteCharacter}
                    onOpenQuests={openQuestsView}
                    onOpenHistory={openHistoryView}
                    onOpenQuestCreator={() => openQuestCreator()}
                    onCreateQuestFromNextSteps={handleCreateQuestFromNextSteps}
                    onContinueQuest={handleContinueQuest}
                    onLaunchQuiz={launchQuizForQuest}
                  />
                }
              />
              <Route
                path="/quests"
                element={
                  <QuestsRoute
                    quests={allQuests}
                    characters={allCharacters}
                    completedQuestIds={completedQuests}
                    inProgressQuestIds={inProgressQuestIds}
                    deletableQuestIds={customQuests.map((quest) => quest.id)}
                    onSelectQuest={handleSelectQuest}
                    onCreateQuest={() => openQuestCreator()}
                    onBack={() => navigate('/')}
                    onDeleteQuest={handleDeleteQuest}
                  />
                }
              />
              <Route
                path="/quests/:questId"
                element={
                  <QuestDetailRoute
                    quests={allQuests}
                    characters={allCharacters}
                    completedQuestIds={completedQuests}
                    inProgressQuestIds={inProgressQuestIds}
                    deletableQuestIds={customQuests.map((quest) => quest.id)}
                    onSelectQuest={handleSelectQuest}
                    onDeleteQuest={handleDeleteQuest}
                  />
                }
              />
              <Route
                path="/quest/new"
                element={
                  <QuestCreatorRoute
                    characters={allCharacters}
                    initialGoal={questCreatorPrefill}
                    onBack={() => {
                      setQuestCreatorPrefill(null);
                      navigate(-1);
                    }}
                    onQuestReady={(quest, mentor) => {
                      setQuestCreatorPrefill(null);
                      startGeneratedQuest(quest, mentor);
                    }}
                    onCharacterCreated={(newChar) => {
                      if (!requireAuth('Sign in to save your custom ancient.')) {
                        return;
                      }
                      updateData((prev) => ({
                        ...prev,
                        customCharacters: [newChar, ...prev.customCharacters],
                      }));
                    }}
                  />
                }
              />
              <Route
                path="/quiz/:questId"
                element={
                  <QuizRoute
                    quests={allQuests}
                    pendingAssessment={pendingQuiz}
                    onExit={handleQuizExit}
                    onComplete={handleQuizComplete}
                  />
                }
              />
              <Route
                path="/conversation"
                element={
                  <ConversationRoute
                    selectedCharacter={selectedCharacter}
                    conversationHistory={conversationHistory}
                    resumeConversationId={resumeConversationId}
                    environmentImageUrl={environmentImageUrl}
                    activeQuest={activeQuest}
                    isSaving={isSaving}
                    isAuthenticated={isAuthenticated}
                    onEnvironmentUpdate={setEnvironmentImageUrl}
                    onConversationUpdate={handleConversationUpdate}
                    onEndConversation={handleEndConversation}
                    onHydrateFromParams={handleConversationRouteHydration}
                  />
                }
              />
              <Route
                path="/history"
                element={
                  <HistoryRoute
                    history={conversationHistory}
                    onResumeConversation={handleResumeConversation}
                    onCreateQuestFromNextSteps={handleCreateQuestFromNextSteps}
                    onDeleteConversation={handleDeleteConversation}
                    onBack={() => navigate('/')}
                  />
                }
              />
              <Route
                path="/characters/new"
                element={<CharacterCreator onCharacterCreated={handleCharacterCreated} onBack={() => navigate('/')} />}
              />
              <Route
                path="/profile"
                element={
                  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-left space-y-6 animate-fade-in">
                    <div>
                      <h2 className="text-3xl font-bold text-amber-200">Explorer Profile</h2>
                      <p className="text-sm text-gray-400 mt-1">
                        Chronicle your journey with the ancients and track your learning legacy.
                      </p>
                    </div>
                    {isAuthenticated ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">Custom Ancients</p>
                            <p className="text-2xl font-semibold text-amber-200 mt-1">{customCharacters.length}</p>
                          </div>
                          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">Conversations</p>
                            <p className="text-2xl font-semibold text-amber-200 mt-1">{conversationHistory.length}</p>
                          </div>
                          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                            <p className="text-xs uppercase tracking-wide text-gray-400">Quests Complete</p>
                            <p className="text-2xl font-semibold text-amber-200 mt-1">{completedQuests.length}</p>
                          </div>
                        </div>

                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 space-y-2">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Account Email</p>
                          <p className="text-lg text-gray-100">{userEmail ?? 'Unknown adventurer'}</p>
                        </div>

                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                          <p className="text-sm text-gray-200 leading-relaxed">
                            Keep creating ancients and embarking on quests to expand your mastery. Each conversation
                            strengthens your connection to the eras you study.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-center">
                        <p className="text-lg text-amber-200 font-semibold mb-2">Traveler, you must sign in.</p>
                        <p className="text-sm text-gray-300">
                          Access your profile, track achievements, and synchronize progress across devices once you are
                          authenticated.
                        </p>
                      </div>
                    )}
                  </div>
                }
              />
              <Route
                path="/settings"
                element={
                  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-left space-y-6 animate-fade-in">
                    <div>
                      <h2 className="text-3xl font-bold text-amber-200">User Settings</h2>
                      <p className="text-sm text-gray-400 mt-1">
                        Customize how you experience conversations with history&apos;s greatest minds.
                      </p>
                    </div>
                    {isAuthenticated ? (
                      <div className="space-y-5">
                        <label className="flex items-center justify-between gap-4 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                          <div>
                            <span className="text-sm font-semibold text-gray-200">Journey Notifications</span>
                            <p className="text-xs text-gray-400">Receive alerts when a quest assessment is ready.</p>
                          </div>
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-amber-500 focus:ring-amber-400"
                            checked={notificationsEnabled}
                            onChange={(event) => setNotificationsEnabled(event.target.checked)}
                          />
                        </label>

                        <label className="flex items-center justify-between gap-4 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                          <div>
                            <span className="text-sm font-semibold text-gray-200">Auto-save Transcripts</span>
                            <p className="text-xs text-gray-400">Keep every exchange stored in your history automatically.</p>
                          </div>
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-amber-500 focus:ring-amber-400"
                            checked={autoSaveEnabled}
                            onChange={(event) => setAutoSaveEnabled(event.target.checked)}
                          />
                        </label>

                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-2">
                          <label htmlFor="theme-select" className="text-sm font-semibold text-gray-200">
                            Interface Theme
                          </label>
                          <p className="text-xs text-gray-400">Choose the ambiance that best matches your study ritual.</p>
                          <select
                            id="theme-select"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-amber-400 focus:ring-amber-400"
                            value={preferredTheme}
                            onChange={(event) => setPreferredTheme(event.target.value as 'system' | 'light' | 'dark')}
                          >
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                            <option value="system">System</option>
                          </select>
                        </div>

                        <p className="text-xs text-gray-400">
                          Settings are stored locally for now. Cloud sync will arrive in a future update of School of the
                          Ancients.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-center">
                        <p className="text-lg text-amber-200 font-semibold mb-2">Sign in to tailor your experience.</p>
                        <p className="text-sm text-gray-300">
                          Manage notifications, transcripts, and appearance preferences once you&apos;re authenticated.
                        </p>
                      </div>
                    )}
                  </div>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
