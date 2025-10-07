import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

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

import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';

import { CHARACTERS, QUESTS } from './constants';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useUserData } from './hooks/useUserData';
import ScrollToTop from './src/components/ScrollToTop';
import SelectorRoute from './src/routes/Selector';
import QuestsRoute from './src/routes/Quests';
import QuestDetailRoute from './src/routes/QuestDetail';
import QuestCreatorRoute from './src/routes/QuestCreator';
import QuizRoute from './src/routes/Quiz';
import ConversationRoute from './src/routes/Conversation';
import HistoryRoute from './src/routes/History';
import CharacterCreatorRoute from './src/routes/CharacterCreator';
import { links } from './src/lib/links';

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
  const [activeConversationSession, setActiveConversationSession] = useState<{
    id: string;
    characterId: string;
  } | null>(null);

  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [inProgressQuestIds, setInProgressQuestIds] = useState<string[]>([]);
  const [questCreatorPrefill, setQuestCreatorPrefill] = useState<string | null>(null);
  const [quizAssessment, setQuizAssessment] = useState<QuestAssessment | null>(null);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [preferredTheme, setPreferredTheme] = useState<'system' | 'light' | 'dark'>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const customCharacters = userData.customCharacters;
  const customQuests = userData.customQuests;
  const completedQuests = userData.completedQuestIds;
  const conversationHistory = userData.conversations;
  const lastQuizResult = userData.lastQuizResult;
  const isSaving = isSavingConversation || dataSaving;
  const isAuthenticated = Boolean(user);
  const isAppLoading = authLoading || dataLoading;

  const ensureConversationComplete = useCallback(
    (options?: { allowSessionId?: string; message?: string }) => {
      const hasActiveSession = Boolean(activeConversationSession || selectedCharacter);
      if (!hasActiveSession) {
        return true;
      }

      if (options?.allowSessionId && activeConversationSession?.id === options.allowSessionId) {
        return true;
      }

      if (isSaving) {
        window.alert('Please wait for your conversation to finish saving.');
        return false;
      }

      const defaultMessage = location.pathname.startsWith('/conversation')
        ? 'Please finish your current conversation by tapping End before leaving.'
        : 'You have an unfinished conversation. Return to it and tap End to create the summary before continuing.';

      window.alert(options?.message ?? defaultMessage);
      return false;
    },
    [activeConversationSession, isSaving, location.pathname, selectedCharacter]
  );

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
    [isAuthenticated]
  );

  useEffect(() => {
    if (isAuthenticated) {
      setAuthPrompt(null);
      setIsAuthModalOpen(false);
    }
  }, [isAuthenticated]);

  const combinedCharacters = useMemo(() => [...customCharacters, ...CHARACTERS], [customCharacters]);
  const allQuests = useMemo(() => [...customQuests, ...QUESTS], [customQuests]);

  const lastQuizQuest = useMemo(() => {
    if (!lastQuizResult) {
      return null;
    }
    return allQuests.find((quest) => quest.id === lastQuizResult.questId) ?? null;
  }, [allQuests, lastQuizResult]);

  const recentConversations = useMemo(
    () => conversationHistory.slice(0, 5),
    [conversationHistory]
  );

  const syncActiveQuestId = useCallback(
    (questId: string | null) => {
      updateData((prev) => {
        if (prev.activeQuestId === questId) {
          return prev;
        }
        return {
          ...prev,
          activeQuestId: questId,
        };
      });
    },
    [updateData]
  );

  const beginConversation = useCallback(
    (
      character: Character,
      options?: { quest?: Quest | null; resumeId?: string | null; environmentImageUrl?: string | null }
    ) => {
      setSelectedCharacter(character);
      setResumeConversationId(options?.resumeId ?? null);
      setEnvironmentImageUrl(options?.environmentImageUrl ?? null);
      if (options?.quest ?? null) {
        const quest = options?.quest ?? null;
        setActiveQuest(quest);
        syncActiveQuestId(quest ? quest.id : null);
      } else {
        setActiveQuest(null);
        syncActiveQuestId(null);
      }
    },
    [syncActiveQuestId]
  );

  const hydrateConversation = useCallback(
    (conversation: SavedConversation) => {
      const character = combinedCharacters.find((item) => item.id === conversation.characterId);
      if (!character) {
        console.error(`Unable to resume conversation: character with ID ${conversation.characterId} not found.`);
        return false;
      }

      let quest: Quest | null = null;
      if (conversation.questId) {
        quest = allQuests.find((item) => item.id === conversation.questId) ?? null;
        if (!quest) {
          console.warn(`Quest with ID ${conversation.questId} not found while resuming conversation.`);
        }
      }

      beginConversation(character, {
        quest,
        resumeId: conversation.id,
        environmentImageUrl: conversation.environmentImageUrl ?? null,
      });
      return true;
    },
    [allQuests, beginConversation, combinedCharacters]
  );

  const hydrateConversationFromParams = useCallback(
    (characterId: string | null, resumeId: string | null) => {
      if (isAppLoading) {
        return;
      }

      if (!characterId && !resumeId) {
        return;
      }

      if (!requireAuth('Sign in to continue your conversation.')) {
        return;
      }

      if (resumeId) {
        if (resumeConversationId === resumeId && selectedCharacter) {
          return;
        }
        const conversation = conversationHistory.find((item) => item.id === resumeId);
        if (!conversation) {
          console.warn(`Conversation with ID ${resumeId} not found.`);
          navigate('/history', { replace: true });
          return;
        }
        hydrateConversation(conversation);
        return;
      }

      if (characterId) {
        if (selectedCharacter?.id === characterId && !resumeId) {
          return;
        }
        const character = combinedCharacters.find((item) => item.id === characterId);
        if (!character) {
          console.warn(`Character with ID ${characterId} not found.`);
          navigate('/', { replace: true });
          return;
        }
        beginConversation(character, {
          quest: null,
          resumeId: null,
          environmentImageUrl: null,
        });
      }
    },
    [
      beginConversation,
      combinedCharacters,
      conversationHistory,
      hydrateConversation,
      isAppLoading,
      navigate,
      requireAuth,
      resumeConversationId,
      selectedCharacter,
    ]
  );

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
          prev.activeQuestId && removedQuestIds.includes(prev.activeQuestId)
            ? null
            : prev.activeQuestId,
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
    if (isAppLoading || !isAuthenticated) {
      return;
    }

    let nextActiveQuest: Quest | null = null;
    if (userData.activeQuestId) {
      nextActiveQuest = allQuests.find((quest) => quest.id === userData.activeQuestId) ?? null;
    }

    setActiveQuest(nextActiveQuest);

    if (!selectedCharacter) {
      let characterToSelect: Character | null = null;

      if (nextActiveQuest) {
        characterToSelect = combinedCharacters.find((c) => c.id === nextActiveQuest?.characterId) ?? null;
      }

      if (!characterToSelect) {
        const params = new URLSearchParams(location.search);
        const characterIdFromUrl = params.get('character');
        if (characterIdFromUrl) {
          characterToSelect = combinedCharacters.find((c) => c.id === characterIdFromUrl) ?? null;
        }
      }

      if (characterToSelect) {
        beginConversation(characterToSelect, {
          quest:
            nextActiveQuest && nextActiveQuest.characterId === characterToSelect.id
              ? nextActiveQuest
              : null,
          resumeId: null,
          environmentImageUrl: null,
        });
        if (location.pathname !== '/conversation') {
          navigate(links.conversation(characterToSelect.id), { replace: true });
        }
      }
    }

    syncQuestProgress();
  }, [
    allQuests,
    beginConversation,
    combinedCharacters,
    isAppLoading,
    isAuthenticated,
    location.pathname,
    location.search,
    navigate,
    selectedCharacter,
    syncQuestProgress,
    userData.activeQuestId,
  ]);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      setSelectedCharacter(null);
      setActiveQuest(null);
      setResumeConversationId(null);
      setEnvironmentImageUrl(null);
      setLastQuestOutcome(null);
      setQuizAssessment(null);
      setActiveConversationSession(null);
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    if (isAppLoading) {
      return;
    }
    syncQuestProgress();
  }, [conversationHistory, isAppLoading, syncQuestProgress]);

  const handleSelectCharacter = (character: Character) => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to start a new conversation.')) {
      return;
    }
    beginConversation(character, { quest: null, resumeId: null, environmentImageUrl: null });
    navigate(links.conversation(character.id));
  };

  const handleSelectQuest = (quest: Quest) => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to embark on a quest.')) {
      return;
    }
    const characterForQuest = combinedCharacters.find((c) => c.id === quest.characterId);
    if (characterForQuest) {
      beginConversation(characterForQuest, { quest, resumeId: null, environmentImageUrl: null });
      navigate(links.conversation(characterForQuest.id));
    } else {
      console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
    }
  };

  const handleContinueQuest = (questId: string | undefined) => {
    if (!ensureConversationComplete()) {
      return;
    }
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
  };

  const handleResumeConversation = (conversation: SavedConversation) => {
    if (!ensureConversationComplete({ allowSessionId: conversation.id })) {
      return;
    }
    if (!requireAuth('Sign in to view your saved conversations.')) {
      return;
    }

    const hydrated = hydrateConversation(conversation);
    if (!hydrated) {
      return;
    }

    navigate(links.conversation(conversation.characterId, { resumeId: conversation.id }));
  };

  const handleConversationUpdate = useCallback(
    (conversation: SavedConversation) => {
      setActiveConversationSession({
        id: conversation.id,
        characterId: conversation.characterId,
      });

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
    [updateData]
  );

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      updateData((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((conversation) => conversation.id !== conversationId),
      }));
    },
    [updateData]
  );

  const handleCharacterCreated = (newCharacter: Character) => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to save your custom ancient.')) {
      return;
    }
    updateData((prev) => ({
      ...prev,
      customCharacters: [newCharacter, ...prev.customCharacters],
      activeQuestId: null,
    }));
    beginConversation(newCharacter, { quest: null, resumeId: null, environmentImageUrl: null });
    navigate(links.conversation(newCharacter.id));
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (!ensureConversationComplete()) {
      return;
    }
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
  };

  const handleDeleteQuest = (questId: string) => {
    if (!ensureConversationComplete()) {
      return;
    }
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
  };

  const openQuestCreator = (goal?: string | null) => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to design new quests.')) {
      return;
    }
    setQuestCreatorPrefill(goal ?? null);
    navigate('/quest/new');
  };

  const openCharacterCreatorView = useCallback(() => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to create a new ancient.')) {
      return;
    }
    navigate('/character/new');
  }, [ensureConversationComplete, navigate, requireAuth]);

  const handleCreateQuestFromNextSteps = (steps: string[], questTitle?: string) => {
    if (!ensureConversationComplete()) {
      return;
    }
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
  };

  const startGeneratedQuest = (quest: Quest, mentor: Character) => {
    if (!ensureConversationComplete()) {
      return;
    }
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
    beginConversation(mentor, { quest, resumeId: null, environmentImageUrl: null });
    navigate(links.conversation(mentor.id));
  };

  const handleQuizExit = () => {
    if (!ensureConversationComplete()) {
      return;
    }
    setQuizAssessment(null);
    navigate('/');
  };

  const handleQuizComplete = (quest: Quest, result: QuizResult) => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to track quiz results.')) {
      setQuizAssessment(null);
      navigate('/');
      return;
    }
    updateData((prev) => {
      let updatedCompleted = [...prev.completedQuestIds];
      const alreadyCompleted = updatedCompleted.includes(quest.id);
      if (result.passed && !alreadyCompleted) {
        updatedCompleted = [...updatedCompleted, quest.id];
      }
      if (!result.passed && alreadyCompleted) {
        updatedCompleted = updatedCompleted.filter((id) => id !== quest.id);
      }

      return {
        ...prev,
        completedQuestIds: updatedCompleted,
        lastQuizResult: result,
      };
    });
    setQuizAssessment(null);
    navigate('/');
  };

  const launchQuizForQuest = (questId: string) => {
    if (!ensureConversationComplete()) {
      return;
    }
    const quest = allQuests.find((q) => q.id === questId);
    if (!quest) {
      console.warn(`Unable to launch quiz: quest with ID ${questId} not found.`);
      navigate('/quests');
      return;
    }

    if (lastQuestOutcome?.questId === questId) {
      setQuizAssessment(lastQuestOutcome);
    } else {
      setQuizAssessment(null);
    }
    navigate(links.quiz(questId));
  };

  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter) return;
    if (!requireAuth('Sign in to save your conversation.')) {
      return;
    }
    setIsSavingConversation(true);
    let questAssessment: QuestAssessment | null = null;
    const questForSession = activeQuest;

    try {
      const existingConversation = conversationHistory.find((c) => c.id === sessionId);

      let updatedConversation:
        | (SavedConversation & { questId?: string; questTitle?: string; questAssessment?: QuestAssessment })
        | SavedConversation =
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
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY ?? '' });
        const questTranscriptText = transcript
          .map((turn) => `${turn.speakerName || turn.speaker}: ${turn.text}`)
          .join('\n');

        const evaluationPrompt = `You are a precise mentor at the School of the Ancients. Assess whether the learner has mastered the quest goal. Respond as JSON with:\n{\n  \\"passed\\": boolean, // true if the learner clearly demonstrates mastery, false otherwise\n  \\"summary\\": string, // 2-3 sentence summary of the learner's performance\n  \\"evidence\\": string[], // key quotes or reasoning that show understanding\n  \\"improvements\\": string[], // actionable suggestions if the student has gaps (empty if passed)\n}\n\nFocus only on the student's contributions. Mark passed=true only if the learner clearly articulates key ideas from the objective.`;

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
          nextHistory[existingIndex] = updatedConversation as SavedConversation;
        } else {
          nextHistory.unshift(updatedConversation as SavedConversation);
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
      setActiveConversationSession(null);
      setSelectedCharacter(null);
      setEnvironmentImageUrl(null);
      setActiveQuest(null);
      syncActiveQuestId(null);
      setResumeConversationId(null);

      if (questAssessment && questAssessment.passed && questForSession) {
        setQuizAssessment(questAssessment);
        navigate(links.quiz(questForSession.id));
      } else {
        navigate('/');
      }
    }
  };

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

  const userEmail = user?.email ?? (user?.user_metadata as { email?: string })?.email;

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeSidebar, isSidebarOpen]);

  useEffect(() => {
    closeSidebar();
  }, [closeSidebar, location.pathname]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  const openHistoryView = useCallback(() => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to review your past conversations.')) {
      return;
    }
    navigate('/history');
  }, [ensureConversationComplete, navigate, requireAuth]);

  const openQuestsView = useCallback(() => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to manage your quests.')) {
      return;
    }
    navigate('/quests');
  }, [ensureConversationComplete, navigate, requireAuth]);

  const openProfileView = useCallback(() => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to view your explorer profile.')) {
      return;
    }
    navigate('/profile');
  }, [ensureConversationComplete, navigate, requireAuth]);

  const openSettingsView = useCallback(() => {
    if (!ensureConversationComplete()) {
      return;
    }
    if (!requireAuth('Sign in to update your settings.')) {
      return;
    }
    navigate('/settings');
  }, [ensureConversationComplete, navigate, requireAuth]);

  const currentView = useMemo(() => {
    if (location.pathname.startsWith('/conversation')) return 'conversation';
    if (location.pathname.startsWith('/history')) return 'history';
    if (location.pathname.startsWith('/quests')) return 'quests';
    if (location.pathname.startsWith('/quest/new')) return 'questCreator';
    if (location.pathname.startsWith('/quiz')) return 'quiz';
    if (location.pathname.startsWith('/character')) return 'creator';
    if (location.pathname.startsWith('/profile')) return 'profile';
    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'selector';
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen bg-[#1a1a1a]">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
              <button
                type="button"
                onClick={openSidebar}
                className="sm:hidden inline-flex items-center justify-center gap-2 rounded-md border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
              >
                Explorer Hub
              </button>
              {userEmail && <span className="text-sm text-gray-300 text-center sm:text-right">Signed in as {userEmail}</span>}
              <button
                type="button"
                onClick={handleSignInClick}
                className="inline-flex items-center gap-2 rounded-md border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
              >
                {isAuthenticated ? 'Sign out' : 'Sign in'}
              </button>
              {!isAuthenticated && authPrompt && (
                <p className="text-xs text-amber-300 max-w-xs text-center sm:text-right">{authPrompt}</p>
              )}
            </div>
          </div>
        </header>

        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <button
              type="button"
              onClick={closeSidebar}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-label="Close explorer hub overlay"
            />
            <div className="relative ml-auto h-full w-full max-w-xs sm:max-w-sm p-4">
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
                variant="mobile"
                onNavigate={closeSidebar}
                onClose={closeSidebar}
              />
            </div>
          </div>
        )}

        <main className="relative max-w-7xl w-full mx-auto flex-grow flex flex-col lg:flex-row gap-6">
          <div className="hidden lg:block lg:w-72 xl:w-80 flex-shrink-0">
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
          </div>
          <div className="flex-1 flex flex-col">
            <ScrollToTop />
            <Routes>
              <Route
                path="/"
                element={
                  <SelectorRoute
                    characters={combinedCharacters}
                    allQuests={allQuests}
                    completedQuestIds={completedQuests}
                    lastQuestOutcome={lastQuestOutcome}
                    lastQuizResult={lastQuizResult}
                    lastQuizQuest={lastQuizQuest}
                    onSelectCharacter={handleSelectCharacter}
                    onDeleteCharacter={handleDeleteCharacter}
                    onStartCharacterCreation={openCharacterCreatorView}
                    onOpenQuests={openQuestsView}
                    onOpenHistory={openHistoryView}
                    onOpenQuestCreator={() => openQuestCreator()}
                    onContinueQuest={handleContinueQuest}
                    onCreateQuestFromNextSteps={handleCreateQuestFromNextSteps}
                    onLaunchQuiz={launchQuizForQuest}
                  />
                }
              />
              <Route
                path="/quests"
                element={
                  <QuestsRoute
                    quests={allQuests}
                    characters={combinedCharacters}
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
                    characters={combinedCharacters}
                    completedQuestIds={completedQuests}
                    inProgressQuestIds={inProgressQuestIds}
                    deletableQuestIds={customQuests.map((quest) => quest.id)}
                    onStartQuest={handleSelectQuest}
                    onDeleteQuest={handleDeleteQuest}
                    onBack={() => navigate('/quests')}
                  />
                }
              />
              <Route
                path="/quest/new"
                element={
                  <QuestCreatorRoute
                    characters={combinedCharacters}
                    initialGoal={questCreatorPrefill}
                    onBack={() => {
                      setQuestCreatorPrefill(null);
                      navigate('/');
                    }}
                    onQuestReady={startGeneratedQuest}
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
                    assessment={quizAssessment}
                    onExit={handleQuizExit}
                    onComplete={handleQuizComplete}
                  />
                }
              />
              <Route
                path="/conversation"
                element={
                  <ConversationRoute
                    character={selectedCharacter}
                    activeQuest={activeQuest}
                    isSaving={isSaving}
                    environmentImageUrl={environmentImageUrl}
                    onEnvironmentUpdate={setEnvironmentImageUrl}
                    resumeConversationId={resumeConversationId}
                    conversationHistory={conversationHistory}
                    onConversationUpdate={handleConversationUpdate}
                    onEndConversation={handleEndConversation}
                    onHydrateFromParams={hydrateConversationFromParams}
                    isAppLoading={isAppLoading}
                  />
                }
              />
              <Route
                path="/history"
                element={
                  <HistoryRoute
                    history={conversationHistory}
                    onBack={() => navigate('/')}
                    onResumeConversation={handleResumeConversation}
                    onCreateQuestFromNextSteps={handleCreateQuestFromNextSteps}
                    onDeleteConversation={handleDeleteConversation}
                  />
                }
              />
              <Route
                path="/character/new"
                element={
                  <CharacterCreatorRoute
                    onCharacterCreated={handleCharacterCreated}
                    onBack={() => navigate('/')}
                  />
                }
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
                            Keep creating ancients and embarking on quests to expand your mastery. Each conversation strengthens
                            your connection to the eras you study.
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
                          <p className="text-xs text-gray-400">
                            Choose the ambiance that best matches your study ritual.
                          </p>
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
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={openSidebar}
            className="lg:hidden fixed bottom-6 right-6 z-30 inline-flex items-center justify-center rounded-full border border-amber-400/60 bg-gray-900/80 px-4 py-3 text-sm font-semibold text-amber-200 shadow-lg shadow-amber-500/10 backdrop-blur"
            aria-label="Open explorer hub"
          >
            ☰
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
