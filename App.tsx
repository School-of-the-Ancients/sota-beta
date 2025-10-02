import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import QuestIcon from './components/icons/QuestIcon';
import QuestCreator from './components/QuestCreator'; // NEW
import AuthGate from './components/AuthGate';
import { supabase } from './supabaseClient';

import { CHARACTERS, QUESTS } from './constants';

// ---- App -------------------------------------------------------------------

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<
    'selector' | 'conversation' | 'history' | 'creator' | 'quests' | 'questCreator'
  >('selector');

  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);

  // end-conversation save/AI-eval flag
  const [isSaving, setIsSaving] = useState(false);

  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const urlSelectionAppliedRef = useRef(false);

  const userId = session?.user?.id ?? null;

  const loadCustomCharacters = useCallback(async () => {
    if (!userId) {
      setCustomCharacters([]);
      return;
    }

    const { data, error } = await supabase
      .from('custom_characters')
      .select('character')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load custom characters:', error);
      return;
    }

    const parsed = (data ?? [])
      .map((row) => row.character as Character | null)
      .filter((character): character is Character => Boolean(character));

    setCustomCharacters(parsed);
  }, [userId]);

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('id, data, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load conversation history:', error);
      return;
    }

    const parsed = (data ?? [])
      .map((row) => {
        const payload = row.data as SavedConversation | null;
        if (!payload) return null;
        return { ...payload, id: row.id } as SavedConversation;
      })
      .filter((conversation): conversation is SavedConversation => Boolean(conversation))
      .sort((a, b) => b.timestamp - a.timestamp);

    setConversations(parsed);
  }, [userId]);

  const loadCompletedQuestIds = useCallback(async () => {
    if (!userId) {
      setCompletedQuests([]);
      return;
    }

    const { data, error } = await supabase
      .from('completed_quests')
      .select('quest_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to load completed quests:', error);
      return;
    }

    setCompletedQuests((data ?? []).map((row) => row.quest_id));
  }, [userId]);

  const persistConversation = useCallback(
    async (conversation: SavedConversation) => {
      if (!userId) return;

      setConversations((prev) => {
        const remaining = prev.filter((item) => item.id !== conversation.id);
        const updated = [conversation, ...remaining];
        return updated.sort((a, b) => b.timestamp - a.timestamp);
      });

      const { error } = await supabase
        .from('conversations')
        .upsert(
          {
            id: conversation.id,
            user_id: userId,
            data: conversation,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Failed to save conversation:', error);
      }
    },
    [userId]
  );

  const markQuestCompletion = useCallback(
    async (questId: string, passed: boolean) => {
      if (!userId) return;

      if (passed) {
        setCompletedQuests((prev) => {
          if (prev.includes(questId)) return prev;
          return [...prev, questId];
        });

        const { error } = await supabase
          .from('completed_quests')
          .upsert({
            user_id: userId,
            quest_id: questId,
            completed_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Failed to mark quest complete:', error);
        }
      } else {
        setCompletedQuests((prev) => prev.filter((id) => id !== questId));

        const { error } = await supabase
          .from('completed_quests')
          .delete()
          .match({ user_id: userId, quest_id: questId });

        if (error) {
          console.error('Failed to reset quest status:', error);
        }
      }
    },
    [userId]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      if (!userId) return;

      setConversations((prev) => prev.filter((item) => item.id !== conversationId));

      const { error } = await supabase
        .from('conversations')
        .delete()
        .match({ user_id: userId, id: conversationId });

      if (error) {
        console.error('Failed to delete conversation:', error);
        loadConversations();
      }
    },
    [userId, loadConversations]
  );

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }, []);

  // ---- Supabase session & data loading ------------------------------------

  useEffect(() => {
    let isMounted = true;

    const initialiseSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.error('Failed to fetch session:', error);
        }
        setSession(data.session ?? null);
      } catch (err) {
        console.error('Failed to initialise session:', err);
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    initialiseSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsDataLoading(false);
      setCustomCharacters([]);
      setConversations([]);
      setCompletedQuests([]);
      return;
    }

    let cancelled = false;
    setIsDataLoading(true);

    const loadAll = async () => {
      await Promise.all([loadCustomCharacters(), loadConversations(), loadCompletedQuestIds()]);
    };

    loadAll()
      .catch((error) => {
        console.error('Failed to load user data:', error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsDataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, loadCustomCharacters, loadConversations, loadCompletedQuestIds]);

  useEffect(() => {
    if (!session) {
      setSelectedCharacter(null);
      setActiveQuest(null);
      setEnvironmentImageUrl(null);
      setLastQuestOutcome(null);
      setView('selector');
      urlSelectionAppliedRef.current = false;
    }
  }, [session]);

  useEffect(() => {
    if (!session || urlSelectionAppliedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (!characterId) return;

    const allCharacters = [...customCharacters, ...CHARACTERS];
    const characterFromUrl = allCharacters.find((c) => c.id === characterId);
    if (characterFromUrl) {
      urlSelectionAppliedRef.current = true;
      setSelectedCharacter(characterFromUrl);
      setView('conversation');
    }
  }, [session, customCharacters]);

  // ---- Navigation helpers ----

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null); // clear any quest when directly picking a character
    urlSelectionAppliedRef.current = true;
    const url = new URL(window.location.href);
    url.searchParams.set('character', character.id);
    window.history.pushState({}, '', url);
  };

  const handleSelectQuest = (quest: Quest) => {
    const allCharacters = [...customCharacters, ...CHARACTERS];
    const characterForQuest = allCharacters.find((c) => c.id === quest.characterId);
    if (characterForQuest) {
      setActiveQuest(quest);
      setSelectedCharacter(characterForQuest);
      setView('conversation');
      urlSelectionAppliedRef.current = true;
      const url = new URL(window.location.href);
      url.searchParams.set('character', characterForQuest.id);
      window.history.pushState({}, '', url);
    } else {
      console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
    }
  };

  const saveCustomCharacter = useCallback(
    async (character: Character) => {
      setCustomCharacters((prev) => {
        const filtered = prev.filter((item) => item.id !== character.id);
        return [character, ...filtered];
      });

      if (userId) {
        const { error } = await supabase
          .from('custom_characters')
          .upsert(
            {
              id: character.id,
              user_id: userId,
              character,
            },
            { onConflict: 'id' }
          );

        if (error) {
          console.error('Failed to save custom character:', error);
        }
      }
    },
    [userId]
  );

  const handleCharacterCreated = async (newCharacter: Character) => {
    await saveCustomCharacter(newCharacter);
    handleSelectCharacter(newCharacter);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      const updatedCharacters = customCharacters.filter((c) => c.id !== characterId);
      setCustomCharacters(updatedCharacters);
      if (userId) {
        const { error } = await supabase
          .from('custom_characters')
          .delete()
          .match({ user_id: userId, id: characterId });

        if (error) {
          console.error('Failed to delete custom character:', error);
          loadCustomCharacters();
        }
      }
    }
  };

  // NEW: handle a freshly-generated quest & mentor from QuestCreator
  const startGeneratedQuest = (quest: Quest, mentor: Character) => {
    setActiveQuest(quest);
    setSelectedCharacter(mentor);
    setView('conversation');
    urlSelectionAppliedRef.current = true;
    const url = new URL(window.location.href);
    url.searchParams.set('character', mentor.id);
    window.history.pushState({}, '', url);
  };

  // ---- End conversation: summarize & (if quest) evaluate mastery ----
  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter) return;
    setIsSaving(true);
    let questAssessment: QuestAssessment | null = null;

    try {
      const existingConversation = conversations.find((c) => c.id === sessionId);

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

      // Conversation summary (skip first system/greeting turn)
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

      // If this was a quest session, evaluate mastery
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
            await markQuestCompletion(activeQuest.id, true);
          } else {
            await markQuestCompletion(activeQuest.id, false);
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

  // ---- View switcher ----

  const renderContent = () => {
    switch (view) {
      case 'conversation':
        if (!selectedCharacter) return null;
        const existingConversation =
          !activeQuest
            ? conversations.find((conversation) => conversation.characterId === selectedCharacter.id) ?? null
            : null;
        return (
          <ConversationView
            character={selectedCharacter}
            onEndConversation={handleEndConversation}
            environmentImageUrl={environmentImageUrl}
            onEnvironmentUpdate={setEnvironmentImageUrl}
            activeQuest={activeQuest}
            isSaving={isSaving} // pass saving state
            existingConversation={existingConversation}
            onAutosave={persistConversation}
          />
        );
      case 'history':
        return (
          <HistoryView
            conversations={conversations}
            onBack={() => setView('selector')}
            onDeleteConversation={handleDeleteConversation}
          />
        );
      case 'creator':
        return <CharacterCreator onCharacterCreated={handleCharacterCreated} onBack={() => setView('selector')} />;
      case 'quests': {
        const allCharacters = [...customCharacters, ...CHARACTERS]; // FIX
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
            onCharacterCreated={async (newChar) => {
              await saveCustomCharacter(newChar);
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-300">
        Loading your account…
      </div>
    );
  }

  if (!session) {
    return <AuthGate />;
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
        <div className="flex justify-end items-center gap-3 mb-4">
          {session.user.email && (
            <span className="text-sm text-gray-400 hidden sm:inline">{session.user.email}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm font-semibold text-amber-300 hover:text-amber-200 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            Sign out
          </button>
        </div>
        <header className="text-center mb-8">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider"
            style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}
          >
            School of the Ancients
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">
          {isDataLoading ? (
            <div className="flex flex-1 items-center justify-center text-gray-300 text-lg">
              Syncing your library…
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
