
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Session } from '@supabase/supabase-js';
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
import { CHARACTERS, QUESTS } from './constants';
import QuestIcon from './components/icons/QuestIcon';
import { supabase } from './supabaseClient';

const sortConversations = (items: SavedConversation[]) =>
  [...items].sort((a, b) => b.timestamp - a.timestamp);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<'selector' | 'conversation' | 'history' | 'creator' | 'quests'>('selector');
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [customCharactersLoaded, setCustomCharactersLoaded] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<SavedConversation[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [hasAppliedCharacterFromUrl, setHasAppliedCharacterFromUrl] = useState(false);

  const allCharacters = useMemo(() => [...customCharacters, ...CHARACTERS], [customCharacters]);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(data.session);
        }
      } catch (error) {
        console.error('Failed to retrieve auth session:', error);
      } finally {
        if (isMounted) {
          setAuthLoaded(true);
        }
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const fetchCustomCharacters = useCallback(async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('custom_characters')
        .select<{ character: Character }>('character')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      const characters = (data ?? []).map(row => row.character);
      setCustomCharacters(characters);
    } catch (error) {
      console.error('Failed to load custom characters:', error);
    } finally {
      setCustomCharactersLoaded(true);
    }
  }, [session]);

  const fetchConversationHistory = useCallback(async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select<{ data: SavedConversation }>('data')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });
      if (error) {
        throw error;
      }
      const conversations = (data ?? []).map(row => row.data);
      setConversationHistory(sortConversations(conversations));
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }, [session]);

  const fetchCompletedQuests = useCallback(async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('completed_quests')
        .select<{ quest_id: string }>('quest_id')
        .eq('user_id', session.user.id);
      if (error) {
        throw error;
      }
      setCompletedQuests((data ?? []).map(row => row.quest_id));
    } catch (error) {
      console.error('Failed to load completed quests:', error);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setCustomCharacters([]);
      setConversationHistory([]);
      setCompletedQuests([]);
      setCustomCharactersLoaded(false);
      setHasAppliedCharacterFromUrl(false);
      return;
    }

    fetchCustomCharacters();
    fetchConversationHistory();
    fetchCompletedQuests();
  }, [session, fetchCustomCharacters, fetchConversationHistory, fetchCompletedQuests]);

  useEffect(() => {
    if (!session || !customCharactersLoaded || hasAppliedCharacterFromUrl) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');

    if (characterId) {
      const characterFromUrl = allCharacters.find(c => c.id === characterId);
      if (characterFromUrl) {
        setSelectedCharacter(characterFromUrl);
        setView('conversation');
      }
    }

    setHasAppliedCharacterFromUrl(true);
  }, [session, customCharactersLoaded, hasAppliedCharacterFromUrl, allCharacters]);

  const handleAuth = useCallback(
    async (mode: 'signin' | 'signup') => {
      setAuthError(null);
      setAuthMessage(null);
      setIsAuthLoading(true);

      try {
        if (mode === 'signin') {
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) {
            throw error;
          }
        } else {
          const { error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
          });
          if (error) {
            throw error;
          }
          setAuthMessage('Check your email to confirm your account before signing in.');
        }
      } catch (error) {
        if (error instanceof Error) {
          setAuthError(error.message);
        } else {
          setAuthError('Authentication failed. Please try again.');
        }
      } finally {
        setIsAuthLoading(false);
      }
    },
    [email, password]
  );

  const handleSignIn = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleAuth('signin');
    },
    [handleAuth]
  );

  const handleSignUp = useCallback(async () => {
    await handleAuth('signup');
  }, [handleAuth]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    } finally {
      setSelectedCharacter(null);
      setView('selector');
      setEnvironmentImageUrl(null);
      setActiveQuest(null);
      setConversationHistory([]);
      setCompletedQuests([]);
    }
  }, []);

  const handleSelectCharacter = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null);
    const url = new URL(window.location.href);
    url.searchParams.set('character', character.id);
    window.history.pushState({}, '', url);
  }, []);

  const handleSelectQuest = useCallback(
    (quest: Quest) => {
      const characterForQuest = allCharacters.find(c => c.id === quest.characterId);
      if (characterForQuest) {
        setActiveQuest(quest);
        setSelectedCharacter(characterForQuest);
        setView('conversation');
        const url = new URL(window.location.href);
        url.searchParams.set('character', characterForQuest.id);
        window.history.pushState({}, '', url);
      } else {
        console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
      }
    },
    [allCharacters]
  );

  const handleCharacterCreated = useCallback(
    async (newCharacter: Character) => {
      if (!session) return;

      try {
        const { error } = await supabase
          .from('custom_characters')
          .upsert({
            id: newCharacter.id,
            user_id: session.user.id,
            character: newCharacter,
          });
        if (error) {
          throw error;
        }
        setCustomCharacters(prev => [newCharacter, ...prev.filter(c => c.id !== newCharacter.id)]);
        handleSelectCharacter(newCharacter);
      } catch (error) {
        console.error('Failed to save custom character:', error);
      }
    },
    [session, handleSelectCharacter]
  );

  const handleDeleteCharacter = useCallback(
    async (characterId: string) => {
      if (!session) return;
      if (!window.confirm('Are you sure you want to permanently delete this ancient?')) {
        return;
      }

      try {
        const { error } = await supabase
          .from('custom_characters')
          .delete()
          .eq('id', characterId)
          .eq('user_id', session.user.id);
        if (error) {
          throw error;
        }
        setCustomCharacters(prev => prev.filter(c => c.id !== characterId));
        setConversationHistory(prev => prev.filter(c => c.characterId !== characterId));
      } catch (error) {
        console.error('Failed to delete custom character:', error);
      }
    },
    [session]
  );

  const upsertConversation = useCallback(
    async (conversation: SavedConversation) => {
      if (!session) return;

      setConversationHistory(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(item => item.id === conversation.id);
        if (existingIndex > -1) {
          updated[existingIndex] = conversation;
        } else {
          updated.push(conversation);
        }
        return sortConversations(updated);
      });

      const { error } = await supabase
        .from('conversations')
        .upsert({
          id: conversation.id,
          user_id: session.user.id,
          character_id: conversation.characterId,
          character_name: conversation.characterName,
          data: conversation,
          updated_at: new Date(conversation.timestamp).toISOString(),
        });

      if (error) {
        console.error('Failed to persist conversation:', error);
        fetchConversationHistory();
      }
    },
    [session, fetchConversationHistory]
  );

  const handleConversationDraftChange = useCallback(
    async (conversation: SavedConversation) => {
      await upsertConversation(conversation);
    },
    [upsertConversation]
  );

  const syncCompletedQuest = useCallback(
    async (questId: string, passed: boolean) => {
      if (!session) return;

      if (passed) {
        setCompletedQuests(prev => (prev.includes(questId) ? prev : [...prev, questId]));
        const { error } = await supabase
          .from('completed_quests')
          .upsert({ user_id: session.user.id, quest_id: questId });
        if (error) {
          console.error('Failed to mark quest complete:', error);
          fetchCompletedQuests();
        }
      } else {
        setCompletedQuests(prev => prev.filter(id => id !== questId));
        const { error } = await supabase
          .from('completed_quests')
          .delete()
          .match({ user_id: session.user.id, quest_id: questId });
        if (error) {
          console.error('Failed to update quest completion:', error);
          fetchCompletedQuests();
        }
      }
    },
    [session, fetchCompletedQuests]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      if (!session) return;

      setConversationHistory(prev => prev.filter(c => c.id !== conversationId));
      try {
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId)
          .eq('user_id', session.user.id);
        if (error) {
          throw error;
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        fetchConversationHistory();
      }
    },
    [session, fetchConversationHistory]
  );

  const handleEndConversation = useCallback(
    async (transcript: ConversationTurn[], sessionId: string) => {
      if (!selectedCharacter) return;
      setIsSaving(true);
      let questAssessment: QuestAssessment | null = null;

      try {
        const existingConversation = conversationHistory.find(c => c.id === sessionId);

        let updatedConversation: SavedConversation = existingConversation ?? {
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
            .map(turn => `${turn.speakerName}: ${turn.text}`)
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
                      description: 'A list of 3-5 key takeaways from the conversation.'
                    }
                  },
                  required: ['overview', 'takeaways']
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
          const questTranscriptText = transcript
            .map(turn => `${turn.speakerName}: ${turn.text}`)
            .join('\n\n');

          if (questTranscriptText.trim()) {
            const evaluationPrompt = `You are a meticulous mentor evaluating whether a student has mastered the quest "${activeQuest.title}". Review the conversation transcript between the mentor and student. Determine if the student demonstrates a working understanding of the quest objective: "${activeQuest.objective}".

Return a JSON object with this structure:
{
  "passed": boolean,
  "summary": string, // one or two sentences explaining your verdict in plain language
  "evidence": string[], // bullet-friendly phrases citing what the student said that shows understanding
  "improvements": string[] // actionable suggestions if the student has gaps (empty if passed)
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
                    evidence: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    improvements: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
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

            await syncCompletedQuest(activeQuest.id, questAssessment.passed);
          }
        } else if (activeQuest) {
          updatedConversation = {
            ...updatedConversation,
            questId: activeQuest.id,
            questTitle: activeQuest.title,
          };
        }

        await upsertConversation(updatedConversation);
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
    },
    [
      selectedCharacter,
      conversationHistory,
      environmentImageUrl,
      activeQuest,
      syncCompletedQuest,
      upsertConversation,
    ]
  );

  const renderContent = () => {
    switch (view) {
      case 'conversation': {
        if (!selectedCharacter) return null;
        const initialConversation = conversationHistory.find(conv => {
          if (activeQuest) {
            return conv.questId === activeQuest.id;
          }
          return conv.characterId === selectedCharacter.id && !conv.questId;
        }) ?? null;

        return (
          <ConversationView
            character={selectedCharacter}
            onEndConversation={handleEndConversation}
            environmentImageUrl={environmentImageUrl}
            onEnvironmentUpdate={setEnvironmentImageUrl}
            activeQuest={activeQuest}
            isSaving={isSaving}
            initialConversation={initialConversation}
            onConversationDraftChange={handleConversationDraftChange}
          />
        );
      }
      case 'history':
        return (
          <HistoryView
            onBack={() => setView('selector')}
            history={conversationHistory}
            onDeleteConversation={handleDeleteConversation}
          />
        );
      case 'creator':
        return <CharacterCreator onCharacterCreated={handleCharacterCreated} onBack={() => setView('selector')} />;
      case 'quests':
        return (
          <QuestsView
            onBack={() => setView('selector')}
            onSelectQuest={handleSelectQuest}
            quests={QUESTS}
            characters={allCharacters}
            completedQuestIds={completedQuests}
          />
        );
      case 'selector':
      default:
        return (
          <div className="text-center animate-fade-in">
             <p className="max-w-3xl mx-auto mb-8 text-gray-400 text-lg">
                Engage in real-time voice conversations with legendary minds from history, or embark on a guided Learning Quest to master a new subject.
            </p>
            <div className="max-w-3xl mx-auto mb-8 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-300 mb-2 font-semibold">Quest Progress</p>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">{completedQuests.length} of {QUESTS.length} quests completed</p>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((completedQuests.length / Math.max(QUESTS.length, 1)) * 100))}%` }}
                />
              </div>
            </div>
            {lastQuestOutcome && (
              <div
                className={`max-w-3xl mx-auto mb-8 rounded-lg border p-5 text-left shadow-lg ${lastQuestOutcome.passed ? 'bg-emerald-900/40 border-emerald-700' : 'bg-red-900/30 border-red-700'}`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-300 font-semibold">Latest Quest Review</p>
                    <h3 className="text-2xl font-bold text-amber-200 mt-1">{lastQuestOutcome.questTitle}</h3>
                  </div>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${lastQuestOutcome.passed ? 'bg-emerald-600 text-emerald-50' : 'bg-red-600 text-red-50'}`}>
                    {lastQuestOutcome.passed ? 'Completed' : 'Needs Review'}
                  </span>
                </div>
                <p className="text-gray-200 mt-4 leading-relaxed">{lastQuestOutcome.summary}</p>
                {lastQuestOutcome.evidence.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-emerald-200 uppercase tracking-wide mb-1">Highlights</p>
                    <ul className="list-disc list-inside text-gray-100 space-y-1 text-sm">
                      {lastQuestOutcome.evidence.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!lastQuestOutcome.passed && lastQuestOutcome.improvements.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-red-200 uppercase tracking-wide mb-1">Next Steps</p>
                    <ul className="list-disc list-inside text-red-100 space-y-1 text-sm">
                      {lastQuestOutcome.improvements.map(item => (
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

  if (!authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-200">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-200 p-4">
        <div className="w-full max-w-md bg-[#202020] p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-amber-300 tracking-wide">School of the Ancients</h1>
            <p className="text-gray-400">Sign in with your Supabase account to continue your studies.</p>
          </div>
          {authError && <div className="bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm">{authError}</div>}
          {authMessage && <div className="bg-emerald-900/40 border border-emerald-700 text-emerald-200 px-3 py-2 rounded-lg text-sm">{authMessage}</div>}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              {isAuthLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <button
            type="button"
            onClick={handleSignUp}
            disabled={isAuthLoading}
            className="w-full bg-gray-700 hover:bg-gray-600 text-amber-200 font-semibold py-3 rounded-lg transition-colors border border-gray-600 disabled:opacity-60"
          >
            Create Account
          </button>
          <p className="text-xs text-gray-500 text-center">
            New accounts require email confirmation sent by Supabase before the first sign-in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#1a1a1a]">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3 text-sm text-gray-300 bg-black/40 px-3 py-2 rounded-full border border-gray-700">
        <span className="hidden sm:inline">{session.user.email ?? 'Signed in'}</span>
        <button
          onClick={handleSignOut}
          className="bg-gray-700 hover:bg-gray-600 text-amber-200 font-semibold px-3 py-1 rounded-full transition-colors"
        >
          Sign Out
        </button>
      </div>
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider" style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}>
            School of the Ancients
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
        </header>
        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
