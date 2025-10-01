
import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Fix: Add necessary imports for summary generation and conversation saving.
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
import { supabase, isSupabaseConfigured } from './supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedConversation[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<'selector' | 'conversation' | 'history' | 'creator' | 'quests'>('selector');
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  // Fix: Add isSaving state to manage the end conversation flow.
  const [isSaving, setIsSaving] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        setIsAuthLoading(false);
      })
      .catch(error => {
        console.error('Failed to retrieve session:', error);
        if (isMounted) {
          setIsAuthLoading(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const fetchCustomCharacters = useCallback(async (userId: string) => {
    if (!supabase) return [] as Character[];
    type Row = { character: Character };
    const { data, error } = await supabase
      .from('custom_characters')
      .select('character')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load custom characters:', error);
      return [];
    }

    return (data as Row[] | null)?.map(row => row.character) ?? [];
  }, []);

  const fetchConversations = useCallback(async (userId: string) => {
    if (!supabase) return [] as SavedConversation[];
    type Row = { payload: SavedConversation; updated_at: string };
    const { data, error } = await supabase
      .from('conversations')
      .select('payload, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }

    return (data as Row[] | null)?.map(row => {
      const payload = row.payload ?? null;
      if (!payload) return null;
      return {
        ...payload,
        timestamp: payload.timestamp ?? new Date(row.updated_at).getTime(),
      } as SavedConversation;
    })
      .filter((item): item is SavedConversation => Boolean(item)) ?? [];
  }, []);

  const fetchCompletedQuestIds = useCallback(async (userId: string) => {
    if (!supabase) return [] as string[];
    type Row = { quest_id: string };
    const { data, error } = await supabase
      .from('completed_quests')
      .select('quest_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to load completed quests:', error);
      return [];
    }

    return (data as Row[] | null)?.map(row => row.quest_id) ?? [];
  }, []);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!session || !supabase) {
        if (!active) return;
        setCustomCharacters([]);
        setHistory([]);
        setCompletedQuests([]);
        setInitialDataLoaded(false);
        setIsDataLoading(false);
        setSelectedCharacter(null);
        setView('selector');
        setEnvironmentImageUrl(null);
        setActiveQuest(null);
        return;
      }

      setIsDataLoading(true);
      try {
        const [characters, conversations, quests] = await Promise.all([
          fetchCustomCharacters(session.user.id),
          fetchConversations(session.user.id),
          fetchCompletedQuestIds(session.user.id),
        ]);

        if (!active) return;

        setCustomCharacters(characters);
        setHistory(conversations);
        setCompletedQuests(quests);
        setInitialDataLoaded(true);
      } catch (error) {
        console.error('Failed to load Supabase data:', error);
      } finally {
        if (active) {
          setIsDataLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [session, fetchCompletedQuestIds, fetchConversations, fetchCustomCharacters]);

  useEffect(() => {
    if (!initialDataLoaded) return;

    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (characterId) {
      const allCharacters = [...customCharacters, ...CHARACTERS];
      const characterFromUrl = allCharacters.find(c => c.id === characterId);
      if (characterFromUrl) {
        setSelectedCharacter(characterFromUrl);
        setView('conversation');
      }
    }
  }, [initialDataLoaded, customCharacters]);

  const persistConversation = useCallback(
    async (conversation: SavedConversation) => {
      if (!session || !supabase) return;

      setHistory(prev => {
        const existingIndex = prev.findIndex(item => item.id === conversation.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = conversation;
          return updated;
        }
        return [conversation, ...prev];
      });

      try {
        const { error } = await supabase
          .from('conversations')
          .upsert({
            id: conversation.id,
            user_id: session.user.id,
            character_id: conversation.characterId,
            payload: conversation,
            updated_at: new Date(conversation.timestamp).toISOString(),
          });

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error('Failed to persist conversation:', error);
      }
    },
    [session, supabase]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!session || !supabase) return;

      let previous: SavedConversation[] = [];
      setHistory(prev => {
        previous = [...prev];
        return prev.filter(item => item.id !== id);
      });

      try {
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('user_id', session.user.id)
          .eq('id', id);

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        setHistory(previous);
      }
    },
    [session, supabase]
  );

  const persistCompletedQuestIds = useCallback(
    async (questIds: string[]) => {
      if (!session || !supabase) return;

      try {
        const { error: deleteError } = await supabase
          .from('completed_quests')
          .delete()
          .eq('user_id', session.user.id);

        if (deleteError) {
          throw deleteError;
        }

        if (questIds.length === 0) {
          return;
        }

        const rows = questIds.map(questId => ({
          user_id: session.user.id,
          quest_id: questId,
        }));

        const { error: insertError } = await supabase
          .from('completed_quests')
          .upsert(rows, { onConflict: 'user_id,quest_id' });

        if (insertError) {
          throw insertError;
        }
      } catch (error) {
        console.error('Failed to update completed quests:', error);
      }
    },
    [session, supabase]
  );

  const handleEmailLogin = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!supabase) return;

      setAuthLoading(true);
      setAuthError(null);
      setAuthMessage(null);

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.href,
          },
        });

        if (error) {
          throw error;
        }

        setAuthMessage('Check your email for a login link to continue.');
      } catch (error) {
        console.error('Failed to start email login:', error);
        setAuthError(error instanceof Error ? error.message : 'Failed to send magic link.');
      } finally {
        setAuthLoading(false);
      }
    },
    [email, supabase]
  );

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }, [supabase]);

  const handleSelectCharacter = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null); // Clear quest if a character is selected manually
    const url = new URL(window.location.href);
    url.searchParams.set('character', character.id);
    window.history.pushState({}, '', url);
  }, []);

  const handleSelectQuest = (quest: Quest) => {
    const allCharacters = [...customCharacters, ...CHARACTERS];
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
  };

  const handleCharacterCreated = (newCharacter: Character) => {
    if (!session || !supabase) return;

    setCustomCharacters(prev => [newCharacter, ...prev]);

    void (async () => {
      try {
        const { error } = await supabase
          .from('custom_characters')
          .upsert({
            user_id: session.user.id,
            character_id: newCharacter.id,
            character: newCharacter,
          });

        if (error) {
          throw error;
        }

        handleSelectCharacter(newCharacter);
      } catch (error) {
        console.error('Failed to save custom character:', error);
        setCustomCharacters(prev => prev.filter(c => c.id !== newCharacter.id));
      }
    })();
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (!session || !supabase) return;
    if (!window.confirm('Are you sure you want to permanently delete this ancient?')) {
      return;
    }

    const previousCharacters = [...customCharacters];
    setCustomCharacters(prev => prev.filter(c => c.id !== characterId));

    void (async () => {
      try {
        const { error } = await supabase
          .from('custom_characters')
          .delete()
          .eq('user_id', session.user.id)
          .eq('character_id', characterId);

        if (error) {
          throw error;
        }

        if (selectedCharacter?.id === characterId) {
          setSelectedCharacter(null);
          setView('selector');
        }
      } catch (error) {
        console.error('Failed to delete custom character:', error);
        setCustomCharacters(previousCharacters);
      }
    })();
  };

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  const activeConversation = useMemo(() => {
    if (!selectedCharacter) return null;
    return sortedHistory.find(conversation => conversation.characterId === selectedCharacter.id) ?? null;
  }, [selectedCharacter, sortedHistory]);

  // Fix: Implement summary generation and state reset on conversation end.
  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter || !session) return;
    setIsSaving(true);
    let questAssessment: QuestAssessment | null = null;

    try {
      const existingConversation = history.find(c => c.id === sessionId);

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

          if (questAssessment.passed) {
            setCompletedQuests(prev => {
              if (prev.includes(activeQuest.id)) {
                void persistCompletedQuestIds(prev);
                return prev;
              }
              const updated = [...prev, activeQuest.id];
              void persistCompletedQuestIds(updated);
              return updated;
            });
          } else {
            setCompletedQuests(prev => {
              if (!prev.includes(activeQuest.id)) {
                void persistCompletedQuestIds(prev);
                return prev;
              }
              const updated = prev.filter(id => id !== activeQuest.id);
              void persistCompletedQuestIds(updated);
              return updated;
            });
          }
        }
      } else if (activeQuest) {
        // Ensure quest metadata is retained even without AI assistance.
        updatedConversation = {
          ...updatedConversation,
          questId: activeQuest.id,
          questTitle: activeQuest.title,
        };
      }

      await persistConversation(updatedConversation);
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

  const renderContent = () => {
    if (!isSupabaseConfigured || !supabase) {
      return (
        <div className="max-w-xl mx-auto bg-gray-900/70 border border-gray-700 rounded-2xl p-6 text-center shadow-xl">
          <h2 className="text-2xl font-semibold text-amber-200 mb-3">Supabase configuration required</h2>
          <p className="text-gray-300">
            Add <code className="text-amber-300">VITE_SUPABASE_URL</code> and <code className="text-amber-300">VITE_SUPABASE_ANON_KEY</code> to your environment to enable secure sign-in and cloud saves.
          </p>
        </div>
      );
    }

    if (isAuthLoading) {
      return (
        <div className="flex flex-1 items-center justify-center text-amber-200 gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Checking your session…</span>
        </div>
      );
    }

    if (!session) {
      return (
        <div className="max-w-md w-full mx-auto bg-gray-900/70 border border-gray-700 rounded-2xl p-6 text-left shadow-xl">
          <h2 className="text-2xl font-semibold text-amber-200 mb-2">Sign in to continue</h2>
          <p className="text-gray-400 text-sm mb-4">
            Enter your email address and we&apos;ll send you a secure login link powered by Supabase.
          </p>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800/70 px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="you@example.com"
              />
            </div>
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            {authMessage && <p className="text-emerald-400 text-sm">{authMessage}</p>}
            <button
              type="submit"
              disabled={authLoading || !email}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-800/60 disabled:cursor-not-allowed text-black font-semibold py-2 rounded-lg transition-colors"
            >
              {authLoading ? 'Sending magic link…' : 'Email me a login link'}
            </button>
          </form>
        </div>
      );
    }

    if (isDataLoading) {
      return (
        <div className="flex flex-1 items-center justify-center text-amber-200 gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading your library…</span>
        </div>
      );
    }

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
            existingConversation={activeConversation}
            onPersistDraft={persistConversation}
          />
        ) : null;
      case 'history':
        return (
          <HistoryView
            onBack={() => setView('selector')}
            history={sortedHistory}
            onDeleteConversation={deleteConversation}
          />
        );
      case 'creator':
        return <CharacterCreator onCharacterCreated={handleCharacterCreated} onBack={() => setView('selector')} />;
      case 'quests':
        const allCharacters = [...customCharacters, ...CHARACTERS];
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
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left gap-4">
            <div>
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider"
                style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}
              >
                School of the Ancients
              </h1>
              <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
            </div>
            {session && (
              <div className="flex flex-col items-center md:items-end gap-2 text-sm">
                <span className="text-gray-400">Signed in as {session.user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-1.5 rounded-lg border border-gray-600 text-gray-200 hover:border-amber-400 hover:text-amber-200 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
