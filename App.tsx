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
  UserData,
} from './types';

import CharacterSelector from './components/CharacterSelector';
import ConversationView from './components/ConversationView';
import HistoryView from './components/HistoryView';
import CharacterCreator from './components/CharacterCreator';
import QuestsView from './components/QuestsView';
import Instructions from './components/Instructions';
import QuestIcon from './components/icons/QuestIcon';
import QuestCreator from './components/QuestCreator';
import QuestQuiz from './components/QuestQuiz';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';

import { CHARACTERS, QUESTS } from './constants';
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import { useUserData } from './hooks/useUserData';
import { DEFAULT_USER_DATA } from './supabase/userData';

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
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const { data: userData, loading: dataLoading, saving: dataSaving, updateData } = useUserData();

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<
    | 'selector'
    | 'conversation'
    | 'history'
    | 'creator'
    | 'quests'
    | 'questCreator'
    | 'quiz'
    | 'profile'
    | 'settings'
  >('selector');

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

  const customCharacters = userData.customCharacters;
  const customQuests = userData.customQuests;
  const completedQuests = userData.completedQuestIds;
  const conversationHistory = userData.conversations;
  const lastQuizResult = userData.lastQuizResult;
  const isSaving = isSavingConversation || dataSaving;
  const isAuthenticated = Boolean(user);
  const isAppLoading = authLoading || dataLoading;

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

  // On mount: load saved characters, url param character, and progress
  useEffect(() => {
    if (isAppLoading) {
      return;
    }

    const allCharacters = [...customCharacters, ...CHARACTERS];
    const availableQuests = [...customQuests, ...QUESTS];

    let nextActiveQuest: Quest | null = null;
    if (userData.activeQuestId) {
      nextActiveQuest = availableQuests.find((quest) => quest.id === userData.activeQuestId) ?? null;
    }

    setActiveQuest(nextActiveQuest);

    if (!selectedCharacter) {
      let characterToSelect: Character | null = null;

      if (nextActiveQuest) {
        characterToSelect = allCharacters.find((c) => c.id === nextActiveQuest?.characterId) ?? null;
      }

      if (!characterToSelect) {
        const urlParams = new URLSearchParams(window.location.search);
        const characterId = urlParams.get('character');
        if (characterId) {
          characterToSelect = allCharacters.find((c) => c.id === characterId) ?? null;
        }
      }

      if (characterToSelect) {
        setSelectedCharacter(characterToSelect);
        setView('conversation');
        updateCharacterQueryParam(characterToSelect.id, 'replace');
      }
    }

    syncQuestProgress();
  }, [
    customCharacters,
    customQuests,
    isAppLoading,
    selectedCharacter,
    syncQuestProgress,
    userData.activeQuestId,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedCharacter(null);
      setActiveQuest(null);
      setView('selector');
      setResumeConversationId(null);
      setEnvironmentImageUrl(null);
    }
  }, [isAuthenticated]);

  // ---- Navigation helpers ----

  const handleSelectCharacter = (character: Character) => {
    if (!requireAuth('Sign in to start a new conversation.')) {
      return;
    }
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null); // clear any quest when directly picking a character
    updateData((prev) => ({
      ...prev,
      activeQuestId: null,
    }));
    setResumeConversationId(null);
    updateCharacterQueryParam(character.id, 'push');
  };

  const handleSelectQuest = (quest: Quest) => {
    if (!requireAuth('Sign in to embark on a quest.')) {
      return;
    }
    const allCharacters = [...customCharacters, ...CHARACTERS];
    const characterForQuest = allCharacters.find((c) => c.id === quest.characterId);
    if (characterForQuest) {
      setActiveQuest(quest);
      updateData((prev) => ({
        ...prev,
        activeQuestId: quest.id,
      }));
      setSelectedCharacter(characterForQuest);
      setView('conversation');
      setResumeConversationId(null);
      updateCharacterQueryParam(characterForQuest.id, 'push');
    } else {
      console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
    }
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
    handleSelectQuest(questToResume);
  };

  const handleResumeConversation = (conversation: SavedConversation) => {
    if (!requireAuth('Sign in to view your saved conversations.')) {
      return;
    }
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

    setView('conversation');

    updateCharacterQueryParam(characterToResume.id, 'push');
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
    setSelectedCharacter(newCharacter);
    setView('conversation');
    setActiveQuest(null);
    setResumeConversationId(null);
    updateCharacterQueryParam(newCharacter.id, 'push');
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
    setView('questCreator');
  };

  const openCharacterCreatorView = useCallback(() => {
    if (!requireAuth('Sign in to create a new ancient.')) {
      return;
    }
    setView('creator');
  }, [requireAuth]);

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

  // NEW: handle a freshly-generated quest & mentor from QuestCreator
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
    if (!requireAuth('Sign in to track quiz results.')) {
      setQuizQuest(null);
      setQuizAssessment(null);
      setView('selector');
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
      if (questAssessment) {
        if (questAssessment.passed && questForSession) {
          setQuizQuest(questForSession);
          setQuizAssessment(questAssessment);
          setView('quiz');
        } else {
          setView('selector');
        }
      } else {
        setView('selector');
      }
      setSelectedCharacter(null);
      setEnvironmentImageUrl(null);
      setActiveQuest(null);
      updateData((prev) => ({
        ...prev,
        activeQuestId: null,
      }));
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
            conversationHistory={conversationHistory}
            onConversationUpdate={handleConversationUpdate}
          />
        ) : null;
      case 'history':
        return (
          <HistoryView
            onBack={() => setView('selector')}
            onResumeConversation={handleResumeConversation}
            onCreateQuestFromNextSteps={handleCreateQuestFromNextSteps}
            history={conversationHistory}
            onDeleteConversation={handleDeleteConversation}
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
              if (!requireAuth('Sign in to save your custom ancient.')) {
                return;
              }
              updateData((prev) => ({
                ...prev,
                customCharacters: [newChar, ...prev.customCharacters],
              }));
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
      case 'profile':
        return (
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
                    Keep creating ancients and embarking on quests to expand your mastery. Each conversation strengthens your
                    connection to the eras you study.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-center">
                <p className="text-lg text-amber-200 font-semibold mb-2">Traveler, you must sign in.</p>
                <p className="text-sm text-gray-300">
                  Access your profile, track achievements, and synchronize progress across devices once you are authenticated.
                </p>
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
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
                onClick={openQuestsView}
                className="flex items-center gap-3 bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-8 rounded-lg transition-colors duration-300 text-lg w-full sm:w-auto"
              >
                <QuestIcon className="w-6 h-6" />
                <span>Learning Quests</span>
              </button>

              <button
                onClick={openHistoryView}
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
              onStartCreation={openCharacterCreatorView}
              onDeleteCharacter={handleDeleteCharacter}
            />
          </div>
        );
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
    setView('history');
  }, [requireAuth]);

  const openHomeView = useCallback(() => {
    setView('selector');
  }, []);

  const openQuestsView = useCallback(() => {
    if (!requireAuth('Sign in to manage your quests.')) {
      return;
    }
    setView('quests');
  }, [requireAuth]);

  const openProfileView = useCallback(() => {
    if (!requireAuth('Sign in to view your explorer profile.')) {
      return;
    }
    setView('profile');
  }, [requireAuth]);

  const openSettingsView = useCallback(() => {
    if (!requireAuth('Sign in to update your settings.')) {
      return;
    }
    setView('settings');
  }, [requireAuth]);

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
        style={{ background: environmentImageUrl ? 'transparent' : 'radial-gradient(circle at top, rgba(251, 191, 36, 0.08), transparent 55%)' }}
      >
        <header className="mb-10">
          <div className="bg-gray-900/70 border border-gray-800/70 shadow-2xl shadow-amber-500/5 backdrop-blur rounded-2xl px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="text-center lg:text-left space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 text-amber-200 px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Live your legend
              </span>
              <div>
                <h1
                  className="text-4xl sm:text-5xl font-bold text-amber-200 tracking-wider drop-shadow-[0_0_25px_rgba(251,191,36,0.25)]"
                >
                  School of the Ancients
                </h1>
                <p className="text-gray-400 mt-2 text-base sm:text-lg max-w-xl">
                  Engage in guided conversations with storied minds, build bespoke quests, and uncover timeless wisdom.
                </p>
              </div>
            </div>
            <nav className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={openHomeView}
                className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10 transition-colors"
              >
                Home
              </button>
              <button
                type="button"
                onClick={handleSignInClick}
                className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10 transition-colors"
              >
                {isAuthenticated ? 'Sign out' : 'Sign in'}
              </button>
              {userEmail && (
                <span className="text-xs text-gray-300 whitespace-nowrap">Signed in as {userEmail}</span>
              )}
              {!isAuthenticated && authPrompt && (
                <p className="text-xs text-amber-300 max-w-[220px] text-center lg:text-right">
                  {authPrompt}
                </p>
              )}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col lg:flex-row gap-6">
          <Sidebar
            recentConversations={recentConversations}
            onSelectConversation={handleResumeConversation}
            onOpenHome={openHomeView}
            onCreateAncient={openCharacterCreatorView}
            onOpenHistory={openHistoryView}
            onOpenProfile={openProfileView}
            onOpenSettings={openSettingsView}
            onOpenQuests={openQuestsView}
            currentView={view}
            isAuthenticated={isAuthenticated}
            userEmail={userEmail}
          />
          <div className="flex-1 flex flex-col">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default App;
