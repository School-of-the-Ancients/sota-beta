import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  Character,
  Quest,
  ConversationTurn,
  SavedConversation,
  Summary,
  QuestAssessment,
} from './types';
import CharacterSelector from './components/CharacterSelector';
import ConversationView from './components/ConversationView';
import HistoryView from './components/HistoryView';
import CharacterCreator from './components/CharacterCreator';
import QuestsView from './components/QuestsView';
import Instructions from './components/Instructions';
import QuestIcon from './components/icons/QuestIcon';
import QuestCreator from './components/QuestCreator';
import { CHARACTERS, QUESTS } from './constants';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<
    'selector' | 'conversation' | 'history' | 'creator' | 'quests' | 'questCreator'
  >('selector');

  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [history, setHistory] = useState<SavedConversation[]>([]);
  const urlCharacterHandledRef = useRef(false);

  const userId = session?.user?.id ?? null;
  const userEmail = session?.user?.email ?? '';

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session);
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
      } finally {
        setIsAuthChecking(false);
      }
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setCustomCharacters([]);
      setHistory([]);
      setCompletedQuests([]);
      setSelectedCharacter(null);
      setActiveQuest(null);
      setEnvironmentImageUrl(null);
      setLastQuestOutcome(null);
      setView('selector');
      urlCharacterHandledRef.current = false;
    }
  }, [userId]);

  const fetchCustomCharacters = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('custom_characters')
        .select('data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const parsed = (data ?? []).map((row: any) => row.data as Character);
      setCustomCharacters(parsed);
    } catch (error) {
      console.error('Failed to load custom characters:', error);
      setCustomCharacters([]);
    }
  }, [userId]);

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('data')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const parsed = (data ?? []).map((row: any) => row.data as SavedConversation);
      setHistory(parsed);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      setHistory([]);
    }
  }, [userId]);

  const fetchCompletedQuests = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('completed_quests')
        .select('quest_id')
        .eq('user_id', userId);
      if (error) throw error;
      const questIds = (data ?? []).map((row: any) => row.quest_id as string);
      setCompletedQuests(questIds);
    } catch (error) {
      console.error('Failed to load completed quests:', error);
      setCompletedQuests([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const loadAll = async () => {
      await Promise.all([fetchCustomCharacters(), fetchHistory(), fetchCompletedQuests()]);
    };
    loadAll();
  }, [userId, fetchCustomCharacters, fetchHistory, fetchCompletedQuests]);

  useEffect(() => {
    if (!userId || urlCharacterHandledRef.current) return;
    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (!characterId) return;
    const allCharacters = [...customCharacters, ...CHARACTERS];
    const characterFromUrl = allCharacters.find((c) => c.id === characterId);
    if (characterFromUrl) {
      urlCharacterHandledRef.current = true;
      setSelectedCharacter(characterFromUrl);
      setView('conversation');
    }
  }, [userId, customCharacters]);

  const upsertHistoryState = useCallback((conversation: SavedConversation) => {
    setHistory((prev) => {
      const filtered = prev.filter((c) => c.id !== conversation.id);
      return [conversation, ...filtered];
    });
  }, []);

  const handleAutosave = useCallback(
    async (conversation: SavedConversation) => {
      if (!userId) return;
      upsertHistoryState(conversation);
      try {
        const { error } = await supabase.from('conversations').upsert({
          id: conversation.id,
          user_id: userId,
          character_id: conversation.characterId,
          updated_at: new Date(conversation.timestamp).toISOString(),
          data: conversation,
        });
        if (error) throw error;
      } catch (error) {
        console.error('Failed to save conversation:', error);
      }
    },
    [upsertHistoryState, userId],
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      if (!userId) return;
      setHistory((prev) => prev.filter((conv) => conv.id !== conversationId));
      try {
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('user_id', userId)
          .eq('id', conversationId);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        await fetchHistory();
      }
    },
    [userId, fetchHistory],
  );

  const syncQuestCompletion = useCallback(
    async (questId: string, completed: boolean) => {
      if (!userId) return;
      try {
        if (completed) {
          const { error } = await supabase.from('completed_quests').upsert({
            user_id: userId,
            quest_id: questId,
            completed_at: new Date().toISOString(),
          });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('completed_quests')
            .delete()
            .eq('user_id', userId)
            .eq('quest_id', questId);
          if (error) throw error;
        }
      } catch (error) {
        console.error('Failed to sync quest completion:', error);
        await fetchCompletedQuests();
      }
    },
    [userId, fetchCompletedQuests],
  );

  const saveCharacter = useCallback(
    async (newCharacter: Character) => {
      if (!userId) throw new Error('No authenticated user');
      setCustomCharacters((prev) => [newCharacter, ...prev.filter((c) => c.id !== newCharacter.id)]);
      try {
        const { error } = await supabase.from('custom_characters').upsert({
          id: newCharacter.id,
          user_id: userId,
          data: newCharacter,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (error) {
        console.error('Failed to save custom character:', error);
        await fetchCustomCharacters();
        throw error;
      }
    },
    [userId, fetchCustomCharacters],
  );

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Enter both email and password.');
      return;
    }

    try {
      setIsAuthSubmitting(true);
      if (authMode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
      }
      setAuthPassword('');
    } catch (error: any) {
      console.error('Authentication failed:', error);
      setAuthError(error?.message ?? 'Authentication failed. Please try again.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSelectCharacter = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null);
    urlCharacterHandledRef.current = true;
    const url = new URL(window.location.href);
    url.searchParams.set('character', character.id);
    window.history.pushState({}, '', url);
  }, []);

  const handleSelectQuest = (quest: Quest) => {
    const allCharacters = [...customCharacters, ...CHARACTERS];
    const characterForQuest = allCharacters.find((c) => c.id === quest.characterId);
    if (characterForQuest) {
      setActiveQuest(quest);
      setSelectedCharacter(characterForQuest);
      setView('conversation');
      urlCharacterHandledRef.current = true;
      const url = new URL(window.location.href);
      url.searchParams.set('character', characterForQuest.id);
      window.history.pushState({}, '', url);
    } else {
      console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
    }
  };

  const startGeneratedQuest = (quest: Quest, mentor: Character) => {
    setActiveQuest(quest);
    setSelectedCharacter(mentor);
    setView('conversation');
    urlCharacterHandledRef.current = true;
    const url = new URL(window.location.href);
    url.searchParams.set('character', mentor.id);
    window.history.pushState({}, '', url);
  };

  const handleCharacterCreated = async (newCharacter: Character) => {
    await saveCharacter(newCharacter);
    handleSelectCharacter(newCharacter);
  };

  const handleGeneratedCharacterPersist = async (newCharacter: Character) => {
    await saveCharacter(newCharacter);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!userId) return;
    if (!window.confirm('Are you sure you want to permanently delete this ancient?')) {
      return;
    }
    setCustomCharacters((prev) => prev.filter((c) => c.id !== characterId));
    try {
      const { error } = await supabase
        .from('custom_characters')
        .delete()
        .eq('user_id', userId)
        .eq('id', characterId);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete custom character:', error);
      await fetchCustomCharacters();
    }
  };

  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter || !userId) return;
    setIsSaving(true);
    let questAssessment: QuestAssessment | null = null;

    try {
      const existingConversation = history.find((c) => c.id === sessionId);

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

      if (activeQuest) {
        updatedConversation = {
          ...updatedConversation,
          questId: activeQuest.id,
          questTitle: activeQuest.title,
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

      if (ai && activeQuest) {
        const questTranscriptText = transcript.map((turn) => `${turn.speakerName}: ${turn.text}`).join('\n\n');

        if (questTranscriptText.trim()) {
          const evaluationPrompt = `You are a meticulous mentor evaluating whether a student has mastered the quest "${activeQuest.title}". Review the conversation transcript between the mentor and student. Determine if the student demonstrates a working understanding of the quest objective: "${activeQuest.objective}".\n\nReturn a JSON object with this structure:\n{\n  "passed": boolean,\n  "summary": string,          // one or two sentences explaining your verdict in plain language\n  "evidence": string[],       // bullet-friendly phrases citing what the student said that shows understanding\n  "improvements": string[]    // actionable suggestions if the student has gaps (empty if passed)\n}\n\nFocus only on the student's contributions. Mark passed=true only if the learner clearly articulates key ideas from the objective.`;

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
            questId: activeQuest.id,
            questTitle: activeQuest.title,
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
            setCompletedQuests((prev) => (prev.includes(activeQuest.id) ? prev : [...prev, activeQuest.id]));
            await syncQuestCompletion(activeQuest.id, true);
          } else {
            setCompletedQuests((prev) => prev.filter((id) => id !== activeQuest.id));
            await syncQuestCompletion(activeQuest.id, false);
          }
        }
      } else if (activeQuest) {
        updatedConversation = {
          ...updatedConversation,
          questId: activeQuest.id,
          questTitle: activeQuest.title,
        };
      }

      await handleAutosave(updatedConversation);
    } catch (error) {
      console.error('Failed to finalize conversation:', error);
    } finally {
      setIsSaving(false);
      if (questAssessment) {
        setLastQuestOutcome(questAssessment);
      } else if (activeQuest) {
        setLastQuestOutcome(null);
      }
      setSelectedCharacter(null);
      setView('selector');
      setEnvironmentImageUrl(null);
      setActiveQuest(null);
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  const allCharacters = useMemo(() => [...customCharacters, ...CHARACTERS], [customCharacters]);

  const existingConversation = useMemo(() => {
    if (!selectedCharacter || activeQuest) return null;
    return history.find((conv) => conv.characterId === selectedCharacter.id) ?? null;
  }, [history, selectedCharacter, activeQuest]);

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
            isSaving={isSaving}
            existingConversation={existingConversation}
            onAutoSave={handleAutosave}
          />
        ) : null;
      case 'history':
        return (
          <HistoryView
            onBack={() => setView('selector')}
            history={history}
            onDeleteConversation={handleDeleteConversation}
          />
        );
      case 'creator':
        return (
          <CharacterCreator
            onCharacterCreated={handleCharacterCreated}
            onBack={() => setView('selector')}
          />
        );
      case 'quests':
        return (
          <QuestsView
            onBack={() => setView('selector')}
            onSelectQuest={handleSelectQuest}
            quests={QUESTS}
            characters={allCharacters}
            completedQuestIds={completedQuests}
            onCreateQuest={() => setView('questCreator')}
          />
        );
      case 'questCreator':
        return (
          <QuestCreator
            characters={allCharacters}
            onBack={() => setView('selector')}
            onQuestReady={startGeneratedQuest}
            onCharacterCreated={handleGeneratedCharacterPersist}
          />
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
                {completedQuests.length} of {QUESTS.length} quests completed
              </p>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((completedQuests.length / Math.max(QUESTS.length, 1)) * 100),
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
                  </div>
                )}
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

              <button
                onClick={() => setView('questCreator')}
                className="bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300 w-full sm:w-auto"
              >
                Create Your Quest
              </button>
            </div>

            <Instructions />

            <CharacterSelector
              characters={allCharacters}
              onSelectCharacter={handleSelectCharacter}
              onStartCreation={() => setView('creator')}
              onDeleteCharacter={handleDeleteCharacter}
            />
          </div>
        );
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-300">
        <p className="animate-pulse">Checking session…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] p-4">
        <div className="w-full max-w-md bg-gray-900/80 border border-gray-700 rounded-2xl shadow-2xl p-6">
          <h1 className="text-3xl font-bold text-amber-300 text-center mb-2">School of the Ancients</h1>
          <p className="text-gray-400 text-center mb-6">Sign in to continue your journey.</p>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                autoComplete={authMode === 'sign-up' ? 'new-password' : 'current-password'}
              />
            </div>
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            <button
              type="submit"
              disabled={isAuthSubmitting}
              className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAuthSubmitting ? 'Working…' : authMode === 'sign-in' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setAuthMode((mode) => (mode === 'sign-in' ? 'sign-up' : 'sign-in'))}
            className="mt-4 w-full text-sm text-amber-300 hover:text-amber-200"
          >
            {authMode === 'sign-in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          </button>
        </div>
      </div>
    );
  }

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
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <div>
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider"
                style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}
              >
                School of the Ancients
              </h1>
              <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
            </div>
            <div className="flex items-center gap-3">
              {userEmail && <span className="text-sm text-gray-400">{userEmail}</span>}
              <button
                onClick={handleSignOut}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;
