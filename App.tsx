
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Fix: Add necessary imports for summary generation and conversation saving.
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
import { CHARACTERS, QUESTS } from './constants';
import QuestIcon from './components/icons/QuestIcon';
import { supabase } from './supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const mergeConversationData = (
  existing: SavedConversation | undefined,
  incoming: SavedConversation
): SavedConversation => {
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    summary: incoming.summary ?? existing.summary,
    questAssessment: incoming.questAssessment ?? existing.questAssessment,
  };
};

type ConversationRow = {
  id: string;
  character_id: string;
  character_name: string;
  portrait_url: string;
  timestamp: number | null;
  transcript: ConversationTurn[];
  environment_image_url: string | null;
  summary: Summary | null;
  quest_id: string | null;
  quest_title: string | null;
  quest_assessment: QuestAssessment | null;
};

type CustomCharacterRow = {
  id: string;
  data: Character;
};

type CompletedQuestRow = {
  quest_id: string;
};

const App: React.FC = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authView, setAuthView] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [hasHandledUrlCharacter, setHasHandledUrlCharacter] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<'selector' | 'conversation' | 'history' | 'creator' | 'quests'>('selector');
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  // Fix: Add isSaving state to manage the end conversation flow.
  const [isSaving, setIsSaving] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);

  const loadUserData = useCallback(async (userId: string) => {
    setIsDataLoading(true);
    try {
      const [charactersResponse, conversationsResponse, completedResponse] = await Promise.all([
        supabase
          .from('custom_characters')
          .select('id, data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('conversations')
          .select(
            'id, character_id, character_name, portrait_url, timestamp, transcript, environment_image_url, summary, quest_id, quest_title, quest_assessment'
          )
          .eq('user_id', userId),
        supabase.from('completed_quests').select('quest_id').eq('user_id', userId),
      ]);

      if (charactersResponse.error) throw charactersResponse.error;
      if (conversationsResponse.error) throw conversationsResponse.error;
      if (completedResponse.error) throw completedResponse.error;

      const loadedCharacters: Character[] = (charactersResponse.data as CustomCharacterRow[] | null)?.map(row => row.data) ?? [];

      const loadedConversations: SavedConversation[] =
        ((conversationsResponse.data as ConversationRow[] | null) ?? []).map(row => ({
          id: row.id,
          characterId: row.character_id,
          characterName: row.character_name,
          portraitUrl: row.portrait_url,
          timestamp: typeof row.timestamp === 'number' ? row.timestamp : Number(row.timestamp ?? Date.now()),
          transcript: (row.transcript ?? []) as ConversationTurn[],
          environmentImageUrl: row.environment_image_url ?? undefined,
          summary: row.summary ?? undefined,
          questId: row.quest_id ?? undefined,
          questTitle: row.quest_title ?? undefined,
          questAssessment: row.quest_assessment ?? undefined,
        })) ?? [];

      loadedConversations.sort((a, b) => b.timestamp - a.timestamp);

      const loadedCompletedQuests: string[] =
        ((completedResponse.data as CompletedQuestRow[] | null) ?? []).map(row => row.quest_id);

      setCustomCharacters(loadedCharacters);
      setConversations(loadedConversations);
      setCompletedQuests(loadedCompletedQuests);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const persistConversation = useCallback(async (conversation: SavedConversation) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('conversations')
        .upsert(
          {
            id: conversation.id,
            user_id: user.id,
            character_id: conversation.characterId,
            character_name: conversation.characterName,
            portrait_url: conversation.portraitUrl,
            timestamp: conversation.timestamp,
            transcript: conversation.transcript,
            environment_image_url: conversation.environmentImageUrl ?? null,
            summary: conversation.summary ?? null,
            quest_id: conversation.questId ?? null,
            quest_title: conversation.questTitle ?? null,
            quest_assessment: conversation.questAssessment ?? null,
          },
          { onConflict: 'id' }
        );

      if (error) throw error;

      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c.id === conversation.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = mergeConversationData(prev[existingIndex], conversation);
          return updated.sort((a, b) => b.timestamp - a.timestamp);
        }
        return [conversation, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      });
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw error;
    }
  }, [user]);

  const removeConversation = useCallback(async (conversationId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('id', conversationId);
      if (error) throw error;
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }, [user]);

  const updateQuestCompletion = useCallback(
    async (questId: string, completed: boolean) => {
      if (!user) return;
      try {
        if (completed) {
          const { error } = await supabase
            .from('completed_quests')
            .upsert({ user_id: user.id, quest_id: questId }, { onConflict: 'user_id,quest_id' });
          if (error) throw error;
          setCompletedQuests(prev => (prev.includes(questId) ? prev : [...prev, questId]));
        } else {
          const { error } = await supabase
            .from('completed_quests')
            .delete()
            .eq('user_id', user.id)
            .eq('quest_id', questId);
          if (error) throw error;
          setCompletedQuests(prev => prev.filter(id => id !== questId));
        }
      } catch (error) {
        console.error('Failed to update quest completion:', error);
      }
    },
    [user]
  );

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please provide both email and password.');
      return;
    }

    setAuthError(null);
    setAuthMessage(null);
    setIsAuthSubmitting(true);

    try {
      if (authView === 'sign_in') {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        if (!data.session) {
          setAuthMessage('Check your email for a confirmation link to complete registration.');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        setAuthError(error.message);
      } else {
        setAuthError('Authentication failed. Please try again.');
      }
    } finally {
      setAuthPassword('');
      setIsAuthSubmitting(false);
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          await loadUserData(data.session.user.id);
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    void initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      setUser(authSession?.user ?? null);

      if (authSession?.user) {
        void loadUserData(authSession.user.id);
      } else {
        setCustomCharacters([]);
        setConversations([]);
        setCompletedQuests([]);
        setSelectedCharacter(null);
        setEnvironmentImageUrl(null);
        setActiveQuest(null);
        setLastQuestOutcome(null);
        setView('selector');
        setHasHandledUrlCharacter(false);
      }

      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  useEffect(() => {
    if (!user || hasHandledUrlCharacter) return;

    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (characterId) {
      const allCharacters = [...customCharacters, ...CHARACTERS];
      const characterFromUrl = allCharacters.find(c => c.id === characterId);
      if (characterFromUrl) {
        setSelectedCharacter(characterFromUrl);
        setView('conversation');
        setHasHandledUrlCharacter(true);
        return;
      }
    }

    setHasHandledUrlCharacter(true);
  }, [user, customCharacters, hasHandledUrlCharacter]);

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null); // Clear quest if a character is selected manually
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
    if (!user) return;
    try {
      const { error } = await supabase
        .from('custom_characters')
        .upsert({ id: newCharacter.id, user_id: user.id, data: newCharacter }, { onConflict: 'id' });
      if (error) throw error;
      setCustomCharacters(prev => [newCharacter, ...prev]);
      handleSelectCharacter(newCharacter);
    } catch (error) {
      console.error('Failed to save custom character:', error);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!user) return;
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      try {
        const { error } = await supabase
          .from('custom_characters')
          .delete()
          .eq('user_id', user.id)
          .eq('id', characterId);
        if (error) throw error;
        setCustomCharacters(prev => prev.filter(c => c.id !== characterId));
      } catch (error) {
        console.error('Failed to delete custom character:', error);
      }
    }
  };

  // Fix: Implement summary generation and state reset on conversation end.
  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter) return;
    setIsSaving(true);
    let questAssessment: QuestAssessment | null = null;

    try {
      const existingConversation = conversations.find(c => c.id === sessionId);

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

          await updateQuestCompletion(activeQuest.id, questAssessment.passed);
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

  const latestConversationForCharacter = useMemo(() => {
    if (!selectedCharacter) return null;
    return conversations.reduce<SavedConversation | null>((latest, conversation) => {
      if (conversation.characterId !== selectedCharacter.id) return latest;
      if (!latest || conversation.timestamp > latest.timestamp) {
        return conversation;
      }
      return latest;
    }, null);
  }, [selectedCharacter, conversations]);

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
            // Fix: Pass the isSaving prop to ConversationView.
            isSaving={isSaving}
            existingConversation={activeQuest ? null : latestConversationForCharacter}
            onAutoSave={persistConversation}
          />
        ) : null;
      case 'history':
        return (
          <HistoryView
            onBack={() => setView('selector')}
            conversations={conversations}
            onDelete={removeConversation}
            isLoading={isDataLoading}
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-300">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-200 p-4">
        <div className="w-full max-w-md bg-[#202020] border border-gray-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-amber-300">School of the Ancients</h1>
            <p className="text-gray-400">Sign in to continue your studies.</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-semibold text-gray-300 mb-1">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={authEmail}
                onChange={event => setAuthEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm font-semibold text-gray-300 mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={authPassword}
                onChange={event => setAuthPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={authView === 'sign_in' ? 'current-password' : 'new-password'}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            {authError && (
              <p className="text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">{authError}</p>
            )}
            {authMessage && (
              <p className="text-sm text-emerald-300 bg-emerald-900/30 border border-emerald-700 rounded-lg px-3 py-2">
                {authMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isAuthSubmitting}
              className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {isAuthSubmitting ? 'Processing...' : authView === 'sign_in' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <p className="text-sm text-gray-400 text-center">
            {authView === 'sign_in' ? 'Need an account?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setAuthView(prev => (prev === 'sign_in' ? 'sign_up' : 'sign_in'));
                setAuthError(null);
                setAuthMessage(null);
              }}
              className="text-amber-300 hover:text-amber-200 font-semibold"
            >
              {authView === 'sign_in' ? 'Sign up' : 'Sign in'}
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
        <div className="flex justify-end items-center gap-3 mb-4 text-sm text-gray-400">
          {user?.email && <span className="hidden sm:inline">Signed in as {user.email}</span>}
          <button
            onClick={handleSignOut}
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg border border-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
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
