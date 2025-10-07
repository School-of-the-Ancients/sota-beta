import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import type {
  Character,
  ConversationTurn,
  Quest,
  QuestAssessment,
  QuizResult,
  SavedConversation,
  Summary,
  UserData,
} from './types';

import CharacterCreator from './components/CharacterCreator';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import ScrollToTop from './components/ScrollToTop';

import SelectorRoute from './src/routes/Selector';
import QuestsRoute from './src/routes/Quests';
import QuestDetailRoute from './src/routes/QuestDetail';
import QuestCreatorRoute from './src/routes/QuestCreator';
import QuizRoute from './src/routes/Quiz';
import ConversationRoute from './src/routes/Conversation';
import HistoryRoute from './src/routes/History';

import { CHARACTERS, QUESTS } from './constants';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useUserData } from './hooks/useUserData';
import { links } from './src/lib/links';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const {
    data: userData,
    loading: dataLoading,
    saving: dataSaving,
    updateData,
  } = useUserData();

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [inProgressQuestIds, setInProgressQuestIds] = useState<string[]>([]);
  const [questCreatorPrefill, setQuestCreatorPrefill] = useState<string | null>(null);
  const [quizQuest, setQuizQuest] = useState<Quest | null>(null);
  const [quizAssessment, setQuizAssessment] = useState<QuestAssessment | null>(null);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [preferredTheme, setPreferredTheme] = useState<'system' | 'light' | 'dark'>('dark');

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isAuthenticated = Boolean(user);
  const isAppLoading = authLoading || dataLoading;
  const isSaving = isSavingConversation || dataSaving;

  const customCharacters = userData.customCharacters;
  const customQuests = userData.customQuests;
  const completedQuests = userData.completedQuestIds;
  const conversationHistory = userData.conversations;
  const lastQuizResult = userData.lastQuizResult;

  const allCharacters = useMemo(
    () => [...customCharacters, ...CHARACTERS],
    [customCharacters]
  );
  const allQuests = useMemo(
    () => [...customQuests, ...QUESTS],
    [customQuests]
  );

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
    syncQuestProgress();
  }, [syncQuestProgress]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedCharacter(null);
      setActiveQuest(null);
      setResumeConversationId(null);
      setEnvironmentImageUrl(null);
      setQuizQuest(null);
      setQuizAssessment(null);
      if (!isAppLoading && location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, isAppLoading, navigate, location.pathname]);

  useEffect(() => {
    if (isAppLoading || !isAuthenticated) {
      return;
    }

    if (userData.activeQuestId) {
      const quest = allQuests.find((item) => item.id === userData.activeQuestId) ?? null;
      setActiveQuest(quest);
      if (quest) {
        const characterForQuest = allCharacters.find((character) => character.id === quest.characterId);
        if (characterForQuest && !selectedCharacter) {
          setSelectedCharacter(characterForQuest);
        }
      }
    } else {
      setActiveQuest(null);
    }
  }, [allCharacters, allQuests, isAppLoading, isAuthenticated, selectedCharacter, userData.activeQuestId]);

  const enforceAuthForPath = useCallback(
    (pathname: string): string | null => {
      if (pathname.startsWith('/conversation')) {
        return 'Sign in to start a new conversation.';
      }
      if (pathname.startsWith('/quests')) {
        return 'Sign in to manage your quests.';
      }
      if (pathname.startsWith('/quest/new')) {
        return 'Sign in to design new quests.';
      }
      if (pathname.startsWith('/quiz')) {
        return 'Sign in to track your quiz progress.';
      }
      if (pathname.startsWith('/history')) {
        return 'Sign in to review your past conversations.';
      }
      if (pathname.startsWith('/profile')) {
        return 'Sign in to view your explorer profile.';
      }
      if (pathname.startsWith('/settings')) {
        return 'Sign in to update your settings.';
      }
      if (pathname.startsWith('/characters')) {
        return 'Sign in to create a new ancient.';
      }
      return null;
    },
    []
  );

  useEffect(() => {
    if (isAppLoading || isAuthenticated) {
      return;
    }
    const message = enforceAuthForPath(location.pathname);
    if (message) {
      requireAuth(message);
      navigate('/', { replace: true });
    }
  }, [enforceAuthForPath, isAppLoading, isAuthenticated, location.pathname, navigate, requireAuth]);

  const selectCharacterInternal = useCallback(
    (character: Character, options?: { navigateToConversation?: boolean }) => {
      setSelectedCharacter(character);
      setActiveQuest(null);
      setResumeConversationId(null);
      updateData((prev) => ({
        ...prev,
        activeQuestId: null,
      }));
      if (options?.navigateToConversation !== false) {
        navigate(links.conversation(character.id));
      }
    },
    [navigate, updateData]
  );

  const startQuestInternal = useCallback(
    (quest: Quest, options?: { navigateToConversation?: boolean }) => {
      const characterForQuest = allCharacters.find((character) => character.id === quest.characterId);
      if (!characterForQuest) {
        console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
        return;
      }

      setActiveQuest(quest);
      updateData((prev) => ({
        ...prev,
        activeQuestId: quest.id,
      }));
      setSelectedCharacter(characterForQuest);
      setResumeConversationId(null);
      setEnvironmentImageUrl(null);

      if (options?.navigateToConversation !== false) {
        navigate(links.conversation(characterForQuest.id));
      }
    },
    [allCharacters, navigate, updateData]
  );

  const resumeConversationInternal = useCallback(
    (conversation: SavedConversation, options?: { navigateToConversation?: boolean }) => {
      const characterToResume = allCharacters.find((character) => character.id === conversation.characterId);
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
          updateData((prev) => ({
            ...prev,
            activeQuestId: questToResume.id,
          }));
        } else {
          console.warn(`Quest with ID ${conversation.questId} not found while resuming conversation.`);
          setActiveQuest(null);
          updateData((prev) => ({
            ...prev,
            activeQuestId: null,
          }));
        }
      } else {
        setActiveQuest(null);
        updateData((prev) => ({
          ...prev,
          activeQuestId: null,
        }));
      }

      if (options?.navigateToConversation !== false) {
        navigate(links.conversation(characterToResume.id, { resumeId: conversation.id }));
      }
    },
    [allCharacters, allQuests, navigate, updateData]
  );

  useEffect(() => {
    if (isAppLoading || !isAuthenticated) {
      return;
    }
    if (!location.pathname.startsWith('/conversation')) {
      return;
    }

    const resumeId = searchParams.get('resume');
    const characterId = searchParams.get('character');

    if (resumeId) {
      const conversation = conversationHistory.find((item) => item.id === resumeId);
      if (conversation && resumeConversationId !== resumeId) {
        resumeConversationInternal(conversation, { navigateToConversation: false });
      }
      if (!conversation) {
        console.warn(`Conversation with ID ${resumeId} not found for resuming.`);
        setResumeConversationId(null);
        navigate('/conversation', { replace: true });
      }
    } else if (characterId) {
      const character = allCharacters.find((item) => item.id === characterId);
      if (character && (!selectedCharacter || selectedCharacter.id !== character.id)) {
        selectCharacterInternal(character, { navigateToConversation: false });
      }
      if (!character) {
        console.warn(`Character with ID ${characterId} not found in catalog.`);
      }
      if (resumeConversationId) {
        setResumeConversationId(null);
      }
    } else if (resumeConversationId) {
      setResumeConversationId(null);
    }
  }, [
    allCharacters,
    conversationHistory,
    isAppLoading,
    isAuthenticated,
    location.pathname,
    navigate,
    resumeConversationId,
    searchParams,
    selectCharacterInternal,
    resumeConversationInternal,
    selectedCharacter,
  ]);

  const handleSelectCharacter = (character: Character) => {
    if (!requireAuth('Sign in to start a new conversation.')) {
      return;
    }
    selectCharacterInternal(character);
  };

  const handleSelectQuest = (quest: Quest) => {
    if (!requireAuth('Sign in to embark on a quest.')) {
      return;
    }
    startQuestInternal(quest);
  };

  const handleContinueQuest = (questId: string | undefined) => {
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
    startQuestInternal(questToResume);
  };

  const handleResumeConversation = (conversation: SavedConversation) => {
    if (!requireAuth('Sign in to view your saved conversations.')) {
      return;
    }
    resumeConversationInternal(conversation);
  };

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
    if (!requireAuth('Sign in to save your custom ancient.')) {
      return;
    }
    updateData((prev) => ({
      ...prev,
      customCharacters: [newCharacter, ...prev.customCharacters],
      activeQuestId: null,
    }));
    selectCharacterInternal(newCharacter);
    setEnvironmentImageUrl(null);
  };

  const handleDeleteCharacter = (characterId: string) => {
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
    if (!requireAuth('Sign in to design new quests.')) {
      return;
    }
    setQuestCreatorPrefill(goal ?? null);
    navigate('/quest/new');
  };

  const openCharacterCreatorView = useCallback(() => {
    if (!requireAuth('Sign in to create a new ancient.')) {
      return;
    }
    navigate('/characters/new');
  }, [navigate, requireAuth]);

  const handleCreateQuestFromNextSteps = (steps: string[], questTitle?: string) => {
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
    setActiveQuest(quest);
    setSelectedCharacter(mentor);
    setResumeConversationId(null);
    setEnvironmentImageUrl(null);
    navigate(links.conversation(mentor.id));
  };

  const handleQuizExit = () => {
    setQuizQuest(null);
    setQuizAssessment(null);
    navigate('/');
  };

  const handleQuizComplete = (result: QuizResult) => {
    if (!requireAuth('Sign in to track quiz results.')) {
      setQuizQuest(null);
      setQuizAssessment(null);
      navigate('/');
      return;
    }
    const quest = quizQuest;
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
    setQuizQuest(null);
    setQuizAssessment(null);
    navigate('/');
  };

  const launchQuizForQuest = (questId: string) => {
    const quest = allQuests.find((q) => q.id === questId);
    if (!quest) {
      console.warn(`Unable to launch quiz: quest with ID ${questId} not found.`);
      navigate('/');
      return;
    }

    setQuizQuest(quest);
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

    if (questForSession) {
      setQuizQuest(null);
      setQuizAssessment(null);
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

      if (questForSession && transcript.length > 0) {
        let summary: Summary | null = null;
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const prompt = `Summarize this conversation with ${selectedCharacter.name}.`;
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-lite',
            contents: prompt + `\n\nTranscript:\n${transcript.map((turn) => `${turn.speakerName}: ${turn.text}`).join('\n')}`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  overview: { type: Type.STRING },
                  takeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['overview', 'takeaways'],
              },
            },
          });

          const parsed = JSON.parse(response.text);
          summary = {
            overview: parsed.overview || '',
            takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
          };
        } catch (error) {
          console.warn('Failed to summarize conversation:', error);
        }

        if (summary) {
          updatedConversation = {
            ...updatedConversation,
            summary,
          };
        }

        if (questForSession && transcript.length > 2) {
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const questTranscriptText = transcript
              .map((turn) => `${turn.speakerName}: ${turn.text}`)
              .join('\n');
            const evaluationPrompt = `You are a master teacher evaluating if a student mastered the quest "${questForSession.title}". Return JSON with:
{
  "passed": boolean,
  "summary": string,
  "evidence": string[],
  "improvements": string[]
}

Focus only on the student's contributions.`;

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
          } catch (error) {
            console.warn('Failed to evaluate quest mastery:', error);
          }
        } else if (questForSession) {
          updatedConversation = {
            ...updatedConversation,
            questId: questForSession.id,
            questTitle: questForSession.title,
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
      if (questAssessment && questAssessment.passed && questForSession) {
        setQuizQuest(questForSession);
        setQuizAssessment(questAssessment);
        navigate(links.quiz(questForSession.id));
      } else {
        navigate('/');
      }
      setSelectedCharacter(null);
      setEnvironmentImageUrl(null);
      setActiveQuest(null);
      updateData((prev) => ({
        ...prev,
        activeQuestId: null,
      }));
      setResumeConversationId(null);
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
              {userEmail && (
                <span className="text-sm text-gray-300">Signed in as {userEmail}</span>
              )}
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
            currentPath={location.pathname}
            isAuthenticated={isAuthenticated}
            userEmail={userEmail}
          />
          <div className="flex-1 flex flex-col">
            <Routes>
              <Route
                path="/"
                element={
                  <SelectorRoute
                    availableCharacters={[...customCharacters, ...CHARACTERS]}
                    completedQuestIds={completedQuests}
                    allQuests={allQuests}
                    lastQuestOutcome={lastQuestOutcome}
                    lastQuizResult={lastQuizResult}
                    lastQuizQuest={lastQuizQuest}
                    onSelectCharacter={handleSelectCharacter}
                    onCreateCharacter={openCharacterCreatorView}
                    onDeleteCharacter={handleDeleteCharacter}
                    onOpenQuests={openQuestsView}
                    onOpenHistory={openHistoryView}
                    onOpenQuestCreator={() => openQuestCreator()}
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
                    characters={[...customCharacters, ...CHARACTERS]}
                    completedQuestIds={completedQuests}
                    inProgressQuestIds={inProgressQuestIds}
                    deletableQuestIds={customQuests.map((quest) => quest.id)}
                    onSelectQuest={handleSelectQuest}
                    onCreateQuest={() => openQuestCreator()}
                    onDeleteQuest={handleDeleteQuest}
                  />
                }
              />
              <Route
                path="/quests/:questId"
                element={
                  <QuestDetailRoute
                    quests={allQuests}
                    characters={[...customCharacters, ...CHARACTERS]}
                    completedQuestIds={completedQuests}
                    onStartQuest={handleSelectQuest}
                    onDeleteQuest={handleDeleteQuest}
                    deletableQuestIds={customQuests.map((quest) => quest.id)}
                  />
                }
              />
              <Route
                path="/quest/new"
                element={
                  <QuestCreatorRoute
                    characters={[...customCharacters, ...CHARACTERS]}
                    initialGoal={questCreatorPrefill}
                    onQuestReady={(quest, character) => {
                      setQuestCreatorPrefill(null);
                      startGeneratedQuest(quest, character);
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
                    onBack={() => {
                      setQuestCreatorPrefill(null);
                      navigate('/');
                    }}
                  />
                }
              />
              <Route
                path="/quiz/:questId"
                element={
                  <QuizRoute
                    quests={allQuests}
                    pendingQuest={quizQuest}
                    pendingAssessment={quizAssessment}
                    onMissingQuest={() => {
                      setQuizQuest(null);
                      setQuizAssessment(null);
                    }}
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
                    environmentImageUrl={environmentImageUrl}
                    onEnvironmentUpdate={setEnvironmentImageUrl}
                    activeQuest={activeQuest}
                    isSaving={isSaving}
                    resumeConversationId={resumeConversationId}
                    conversationHistory={conversationHistory}
                    onConversationUpdate={handleConversationUpdate}
                    onEndConversation={handleEndConversation}
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
                  />
                }
              />
              <Route
                path="/characters/new"
                element={
                  <CharacterCreator
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
                          Settings are stored locally for now. Cloud sync will arrive in a future update of School of the Ancients.
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
