import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  Character,
  Quest,
  ConversationTurn,
  SavedConversation,
  Summary,
  QuestAssessment,
} from './types';
import type { Session } from '@supabase/supabase-js';

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

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [isUserDataLoading, setIsUserDataLoading] = useState(false);

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<
    'selector' | 'conversation' | 'history' | 'creator' | 'quests' | 'questCreator'
  >('selector');
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [hasCheckedUrlCharacter, setHasCheckedUrlCharacter] = useState(false);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!session) {
      setHasCheckedUrlCharacter(false);
    }
  }, [session]);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
        setIsAuthLoading(false);
      })
      .catch(error => {
        console.error('Failed to get session:', error);
        setIsAuthLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAuthLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const loadUserData = useCallback(async () => {
    if (!supabase || !userId) return;
    setIsUserDataLoading(true);

    try {
      const { data: characterRows, error: characterError } = await supabase
        .from('custom_characters')
        .select('character_id, data')
        .eq('user_id', userId)
        .order('inserted_at', { ascending: false });

      if (characterError) throw characterError;

      const characterData = (characterRows ?? []).map(row => {
        const data = row.data as Character;
        return {
          ...data,
          id: row.character_id ?? data.id,
        };
      });
      setCustomCharacters(characterData);

      const { data: conversationRows, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (conversationError) throw conversationError;

      const conversationData = (conversationRows ?? []).map(row => ({
        id: row.id as string,
        characterId: (row.character_id as string) ?? '',
        characterName: (row.character_name as string) ?? '',
        portraitUrl: (row.portrait_url as string) ?? '',
        timestamp: row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now(),
        transcript: (row.transcript as ConversationTurn[]) ?? [],
        environmentImageUrl: (row.environment_image_url as string | null) ?? undefined,
        summary: (row.summary as Summary | null) ?? undefined,
        questId: (row.quest_id as string | null) ?? undefined,
        questTitle: (row.quest_title as string | null) ?? undefined,
        questAssessment: (row.quest_assessment as QuestAssessment | null) ?? undefined,
      }));
      setConversations(conversationData);

      const { data: questRows, error: questError } = await supabase
        .from('completed_quests')
        .select('quest_id')
        .eq('user_id', userId);

      if (questError) throw questError;

      setCompletedQuests((questRows ?? []).map(row => row.quest_id as string));
    } catch (error) {
      console.error('Failed to load Supabase data:', error);
    } finally {
      setIsUserDataLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCustomCharacters([]);
      setConversations([]);
      setCompletedQuests([]);
      return;
    }

    loadUserData();
  }, [userId, loadUserData]);

  useEffect(() => {
    if (!session || hasCheckedUrlCharacter || isUserDataLoading) return;

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

    setHasCheckedUrlCharacter(true);
  }, [session, customCharacters, hasCheckedUrlCharacter, isUserDataLoading]);

  const persistCustomCharacter = useCallback(
    async (character: Character) => {
      if (!supabase || !userId) return;

      const { error } = await supabase.from('custom_characters').upsert({
        user_id: userId,
        character_id: character.id,
        data: character,
      });

      if (error) throw error;

      setCustomCharacters(prev => {
        const filtered = prev.filter(c => c.id !== character.id);
        return [character, ...filtered];
      });
    },
    [userId]
  );

  const persistConversation = useCallback(
    async (conversation: SavedConversation) => {
      if (!supabase || !userId) return;

      const { error } = await supabase.from('conversations').upsert({
        id: conversation.id,
        user_id: userId,
        character_id: conversation.characterId,
        character_name: conversation.characterName,
        portrait_url: conversation.portraitUrl,
        transcript: conversation.transcript,
        environment_image_url: conversation.environmentImageUrl ?? null,
        summary: conversation.summary ?? null,
        quest_id: conversation.questId ?? null,
        quest_title: conversation.questTitle ?? null,
        quest_assessment: conversation.questAssessment ?? null,
        updated_at: new Date(conversation.timestamp).toISOString(),
      });

      if (error) throw error;

      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c.id === conversation.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = conversation;
          return updated.sort((a, b) => b.timestamp - a.timestamp);
        }
        return [conversation, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      });
    },
    [userId]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!supabase || !userId) return;

      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId)
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== id));
    },
    [userId]
  );

  const addQuestCompletion = useCallback(
    async (questId: string) => {
      if (!supabase || !userId) return;

      const { error } = await supabase.from('completed_quests').upsert({
        user_id: userId,
        quest_id: questId,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      setCompletedQuests(prev => (prev.includes(questId) ? prev : [...prev, questId]));
    },
    [userId]
  );

  const removeQuestCompletion = useCallback(
    async (questId: string) => {
      if (!supabase || !userId) return;

      const { error } = await supabase
        .from('completed_quests')
        .delete()
        .eq('user_id', userId)
        .eq('quest_id', questId);

      if (error) throw error;

      setCompletedQuests(prev => prev.filter(id => id !== questId));
    },
    [userId]
  );

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null);
    const url = new URL(window.location.href);
    url.searchParams.set('character', character.id);
    window.history.pushState({}, '', url);
  };

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

  const handleCharacterCreated = async (newCharacter: Character) => {
    try {
      await persistCustomCharacter(newCharacter);
      handleSelectCharacter(newCharacter);
    } catch (error) {
      console.error('Failed to save custom character:', error);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!supabase || !userId) return;
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      try {
        const { error } = await supabase
          .from('custom_characters')
          .delete()
          .eq('user_id', userId)
          .eq('character_id', characterId);

        if (error) throw error;

        setCustomCharacters(prev => prev.filter(c => c.id !== characterId));
      } catch (error) {
        console.error('Failed to delete custom character:', error);
      }
    }
  };

  const startGeneratedQuest = (quest: Quest, mentor: Character) => {
    setActiveQuest(quest);
    setSelectedCharacter(mentor);
    setView('conversation');
    const url = new URL(window.location.href);
    url.searchParams.set('character', mentor.id);
    window.history.pushState({}, '', url);
  };

  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter) return;
    setIsSaving(true);
    let questAssessment: QuestAssessment | null = null;

    try {
      const existingConversation = conversations.find(c => c.id === sessionId);

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
          .map(turn => `${turn.speakerName}: ${turn.text}`)
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
        const questTranscriptText = transcript.map(turn => `${turn.speakerName}: ${turn.text}`).join('\n\n');

        if (questTranscriptText.trim()) {
          const evaluationPrompt = `You are a meticulous mentor evaluating whether a student has mastered the quest "${activeQuest.title}". Review the conversation transcript between the mentor and student. Determine if the student demonstrates a working understanding of the quest objective: "${activeQuest.objective}".\n\nReturn a JSON object with this structure:\n{\n  "passed": boolean,\n  "summary": string,\n  "evidence": string[],\n  "improvements": string[]\n}\n\nFocus only on the student's contributions. Mark passed=true only if the learner clearly articulates key ideas from the objective.`;

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
            await addQuestCompletion(activeQuest.id);
          } else {
            await removeQuestCompletion(activeQuest.id);
          }
        }
      } else if (activeQuest) {
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
            savedConversation={conversations.find(c => c.characterId === selectedCharacter.id) ?? null}
            onAutoSave={persistConversation}
          />
        ) : null;
      case 'history':
        return (
          <HistoryView
            onBack={() => setView('selector')}
            history={conversations}
            onDeleteConversation={deleteConversation}
            isLoading={isUserDataLoading}
          />
        );
      case 'creator':
        return (
          <CharacterCreator
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
            quests={QUESTS}
            characters={allCharacters}
            completedQuestIds={completedQuests}
            onCreateQuest={() => setView('questCreator')}
          />
        );
      }
      case 'questCreator': {
        const allChars = [...customCharacters, ...CHARACTERS];
        return (
          <QuestCreator
            characters={allChars}
            onBack={() => setView('selector')}
            onQuestReady={startGeneratedQuest}
            onCharacterCreated={async newChar => {
              try {
                await persistCustomCharacter(newChar);
              } catch (error) {
                console.error('Failed to store generated character:', error);
              }
            }}
          />
        );
      }
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
                      Math.round((completedQuests.length / Math.max(QUESTS.length, 1)) * 100)
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

              <button
                onClick={() => setView('questCreator')}
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

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setIsAuthSubmitting(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      if (authMode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (!data.session) {
          setAuthMessage('Check your inbox to confirm your email address.');
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-200 p-6 text-center">
        <div className="max-w-lg">
          <h1 className="text-3xl font-bold mb-4">Supabase Not Configured</h1>
          <p className="text-gray-400">
            Please set the <code className="text-amber-300">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-amber-300">VITE_SUPABASE_ANON_KEY</code> environment variables to enable authentication and
            cloud saves.
          </p>
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-200">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Preparing the academy...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-200 p-4">
        <div className="w-full max-w-md bg-gray-900/80 border border-gray-700 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-3xl font-bold text-amber-300 text-center mb-6">School of the Ancients</h1>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            {authMessage && <p className="text-emerald-400 text-sm">{authMessage}</p>}
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
              disabled={isAuthSubmitting}
            >
              {isAuthSubmitting ? 'Please wait...' : authMode === 'signIn' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-4">
            {authMode === 'signIn' ? 'Need an account?' : 'Already enrolled?'}{' '}
            <button
              type="button"
              className="text-amber-300 hover:text-amber-200 font-semibold"
              onClick={() => setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn')}
            >
              {authMode === 'signIn' ? 'Create one' : 'Sign in'}
            </button>
          </p>
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
        <header className="text-center mb-8">
          <div className="flex justify-end mb-2">
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-400 hover:text-amber-300 transition-colors"
            >
              Sign out
            </button>
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider"
            style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}
          >
            School of the Ancients
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;

