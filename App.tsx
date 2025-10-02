import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { User } from '@supabase/supabase-js';

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
import QuestCreator from './components/QuestCreator'; // NEW

import { CHARACTERS, QUESTS } from './constants';
import { supabase } from './supabaseClient';

// ---- App -------------------------------------------------------------------

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<
    'selector' | 'conversation' | 'history' | 'creator' | 'quests' | 'questCreator'
  >('selector');

  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);

  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const allCharacters = useMemo(() => {
    const merged = [...customCharacters];
    const existingIds = new Set(merged.map((c) => c.id));
    for (const character of CHARACTERS) {
      if (!existingIds.has(character.id)) {
        merged.push(character);
      }
    }
    return merged;
  }, [customCharacters]);

  const fetchUserData = async (currentUser: User) => {
    setIsDataLoading(true);
    try {
      const [charactersRes, conversationsRes, questsRes] = await Promise.all([
        supabase
          .from('custom_characters')
          .select('character')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('conversations')
          .select(
            'id, character_id, character_name, portrait_url, timestamp, transcript, environment_image_url, summary, quest_id, quest_title, quest_assessment'
          )
          .eq('user_id', currentUser.id)
          .order('timestamp', { ascending: false }),
        supabase
          .from('completed_quests')
          .select('quest_id')
          .eq('user_id', currentUser.id),
      ]);

      if (charactersRes.error) {
        console.error('Failed to load custom characters:', charactersRes.error.message);
      } else {
        const characters =
          charactersRes.data?.map((row) => row.character as Character).filter(Boolean) ?? [];
        setCustomCharacters(characters);
      }

      if (conversationsRes.error) {
        console.error('Failed to load conversations:', conversationsRes.error.message);
      } else {
        const loadedConversations: SavedConversation[] =
          conversationsRes.data?.map((row) => ({
            id: row.id,
            characterId: row.character_id,
            characterName: row.character_name,
            portraitUrl: row.portrait_url,
            timestamp: row.timestamp,
            transcript: (row.transcript as ConversationTurn[]) ?? [],
            environmentImageUrl: row.environment_image_url ?? undefined,
            summary: (row.summary as Summary | null) ?? undefined,
            questId: row.quest_id ?? undefined,
            questTitle: row.quest_title ?? undefined,
            questAssessment: (row.quest_assessment as QuestAssessment | null) ?? undefined,
          })) ?? [];
        setConversations(loadedConversations);
      }

      if (questsRes.error) {
        console.error('Failed to load completed quests:', questsRes.error.message);
      } else {
        const questIds = questsRes.data?.map((row) => row.quest_id).filter(Boolean) ?? [];
        setCompletedQuests(questIds);
      }
    } catch (error) {
      console.error('Failed to fetch Supabase data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const persistCustomCharacter = async (character: Character) => {
    if (!user) return;
    setCustomCharacters((prev) => {
      const filtered = prev.filter((c) => c.id !== character.id);
      return [character, ...filtered];
    });
    const { error } = await supabase.from('custom_characters').upsert(
      {
        user_id: user.id,
        character_id: character.id,
        character,
      },
      { onConflict: 'character_id' }
    );
    if (error) {
      console.error('Failed to save custom character:', error.message);
    }
  };

  const removeCustomCharacter = async (characterId: string) => {
    if (!user) return;
    setCustomCharacters((prev) => prev.filter((c) => c.id !== characterId));
    const { error } = await supabase
      .from('custom_characters')
      .delete()
      .eq('user_id', user.id)
      .eq('character_id', characterId);
    if (error) {
      console.error('Failed to delete custom character:', error.message);
    }
  };

  const upsertConversation = async (conversation: SavedConversation) => {
    if (!user) return;
    setConversations((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === conversation.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = conversation;
        return updated.sort((a, b) => b.timestamp - a.timestamp);
      }
      return [conversation, ...prev].sort((a, b) => b.timestamp - a.timestamp);
    });

    const { error } = await supabase.from('conversations').upsert(
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
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('Failed to save conversation:', error.message);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user) return;
    setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', user.id)
      .eq('id', conversationId);
    if (error) {
      console.error('Failed to delete conversation:', error.message);
    }
  };

  const markQuestCompleted = async (questId: string) => {
    if (!user) return;
    setCompletedQuests((prev) => {
      if (prev.includes(questId)) return prev;
      return [...prev, questId];
    });
    const { error } = await supabase.from('completed_quests').upsert(
      {
        user_id: user.id,
        quest_id: questId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,quest_id' }
    );
    if (error) {
      console.error('Failed to mark quest as completed:', error.message);
    }
  };

  const unmarkQuestCompleted = async (questId: string) => {
    if (!user) return;
    setCompletedQuests((prev) => prev.filter((id) => id !== questId));
    const { error } = await supabase
      .from('completed_quests')
      .delete()
      .eq('user_id', user.id)
      .eq('quest_id', questId);
    if (error) {
      console.error('Failed to unmark quest completion:', error.message);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setIsAuthLoading(false);
    };

    void initAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setCustomCharacters([]);
      setConversations([]);
      setCompletedQuests([]);
      setLastQuestOutcome(null);
      setEnvironmentImageUrl(null);
      return;
    }

    void fetchUserData(user);
  }, [user]);

  useEffect(() => {
    if (!user || selectedCharacter) return;
    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (!characterId) return;
    const characterFromUrl = allCharacters.find((c) => c.id === characterId);
    if (characterFromUrl) {
      setSelectedCharacter(characterFromUrl);
      setView('conversation');
    }
  }, [allCharacters, selectedCharacter, user]);

  // ---- Navigation helpers ----

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null); // clear any quest when directly picking a character
    const url = new URL(window.location.href);
    url.searchParams.set('character', character.id);
    window.history.pushState({}, '', url);
  };

  const handleSelectQuest = (quest: Quest) => {
    const characterForQuest = allCharacters.find((c) => c.id === quest.characterId);
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
    await persistCustomCharacter(newCharacter);
    handleSelectCharacter(newCharacter);
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      void removeCustomCharacter(characterId);
    }
  };

  // NEW: handle a freshly-generated quest & mentor from QuestCreator
  const startGeneratedQuest = (quest: Quest, mentor: Character) => {
    setActiveQuest(quest);
    setSelectedCharacter(mentor);
    setView('conversation');
    const url = new URL(window.location.href);
    url.searchParams.set('character', mentor.id);
    window.history.pushState({}, '', url);
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please provide both email and password.');
      return;
    }

    if (authMode === 'signIn') {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setAuthError(error.message);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) {
        setAuthError(error.message);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthEmail('');
    setAuthPassword('');
  };

  // ---- End conversation: summarize & (if quest) evaluate mastery ----
  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter || !user) return;
    setIsSaving(true);
    let questAssessment: QuestAssessment | null = null;
    let updatedConversation: SavedConversation | null = null;

    try {
      const existingConversation = conversations.find((c) => c.id === sessionId);

      updatedConversation = {
        ...(existingConversation ?? {
          id: sessionId,
          characterId: selectedCharacter.id,
          characterName: selectedCharacter.name,
          portraitUrl: selectedCharacter.portraitUrl,
        }),
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
          const evaluationPrompt = `You are a meticulous mentor evaluating whether a student has mastered the quest "${activeQuest.title}". Review the conversation transcript between the mentor and student. Determine if the student demonstrates a working understanding of the quest objective: "${activeQuest.objective}".

Return a JSON object with this structure:
{
  "passed": boolean,
  "summary": string,          // one or two sentences explaining your verdict in plain language
  "evidence": string[],       // bullet-friendly phrases citing what the student said that shows understanding
  "improvements": string[]    // actionable suggestions if the student has gaps (empty if passed)
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
            await markQuestCompleted(activeQuest.id);
          } else {
            await unmarkQuestCompleted(activeQuest.id);
          }
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
  };

  const activeConversationRecord = useMemo(() => {
    if (!selectedCharacter) return null;
    return conversations.find((conv) => conv.characterId === selectedCharacter.id) ?? null;
  }, [conversations, selectedCharacter]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-300">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] p-4">
        <div className="w-full max-w-md bg-gray-900/90 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-amber-300 text-center mb-2">School of the Ancients</h1>
          <p className="text-center text-gray-400 mb-6">Sign in to continue your studies.</p>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="••••••••"
                required
              />
            </div>
            {authError && <p className="text-sm text-red-400">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2 rounded-lg transition-colors"
            >
              {authMode === 'signIn' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-400">
            {authMode === 'signIn' ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signUp');
                  setAuthError(null);
                }}
                className="text-amber-300 hover:text-amber-200"
              >
                Need an account? Sign up.
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signIn');
                  setAuthError(null);
                }}
                className="text-amber-300 hover:text-amber-200"
              >
                Already registered? Sign in.
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
            existingConversation={activeQuest ? null : activeConversationRecord}
            onAutosave={upsertConversation}
          />
        ) : null;
      case 'history':
        return (
          <HistoryView
            onBack={() => setView('selector')}
            history={conversations}
            onDeleteConversation={deleteConversation}
          />
        );
      case 'creator':
        return <CharacterCreator onCharacterCreated={handleCharacterCreated} onBack={() => setView('selector')} />;
      case 'quests': {
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
            onCharacterCreated={(newChar) => {
              void persistCustomCharacter(newChar);
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

              {/* NEW CTA */}
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
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider"
            style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}
          >
            School of the Ancients
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-400">
            <span>Signed in as {user.email ?? 'Scholar'}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-1 rounded-full bg-gray-800/60 border border-gray-700 text-amber-200 hover:bg-gray-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">
          {isDataLoading && (
            <div className="mb-4 text-center text-sm text-gray-400">Syncing your progress...</div>
          )}
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
