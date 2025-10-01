
import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
// Fix: Add necessary imports for summary generation and conversation saving.
import { GoogleGenAI, Type } from '@google/genai';
import type {
  Character,
  Quest,
  ConversationTurn,
  SavedConversation,
  Summary,
  QuestAssessment,
  UserProfile,
} from './types';
import { supabase } from './supabaseClient';
import CharacterSelector from './components/CharacterSelector';
import ConversationView from './components/ConversationView';
import HistoryView from './components/HistoryView';
import CharacterCreator from './components/CharacterCreator';
import QuestsView from './components/QuestsView';
import Instructions from './components/Instructions';
import { CHARACTERS, QUESTS } from './constants';
import QuestIcon from './components/icons/QuestIcon';

const CUSTOM_CHARACTERS_KEY = 'school-of-the-ancients-custom-characters';
// Fix: Add history key constant for conversation management.
const HISTORY_KEY = 'school-of-the-ancients-history';
const COMPLETED_QUESTS_KEY = 'school-of-the-ancients-completed-quests';

const getUserScopedKey = (baseKey: string, userId?: string) =>
  userId ? `${baseKey}:${userId}` : baseKey;

// Fix: Add helper functions to manage conversation history in localStorage.
const loadConversations = (storageKey: string): SavedConversation[] => {
  try {
    const rawHistory = localStorage.getItem(storageKey);
    return rawHistory ? JSON.parse(rawHistory) : [];
  } catch (error) {
    console.error('Failed to load conversation history:', error);
    return [];
  }
};

const saveConversationToLocalStorage = (storageKey: string, conversation: SavedConversation) => {
  try {
    const history = loadConversations(storageKey);
    const existingIndex = history.findIndex(c => c.id === conversation.id);
    if (existingIndex > -1) {
      history[existingIndex] = conversation;
    } else {
      history.unshift(conversation);
    }
    localStorage.setItem(storageKey, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
};

const loadCompletedQuests = (storageKey: string): string[] => {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load completed quests:', error);
    return [];
  }
};

const saveCompletedQuests = (storageKey: string, questIds: string[]) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(questIds));
  } catch (error) {
    console.error('Failed to save completed quests:', error);
  }
};

const loadCustomCharacters = (storageKey: string): Character[] => {
  try {
    const storedCharacters = localStorage.getItem(storageKey);
    return storedCharacters ? JSON.parse(storedCharacters) : [];
  } catch (error) {
    console.error('Failed to load custom characters:', error);
    return [];
  }
};

const saveCustomCharacters = (storageKey: string, characters: Character[]) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(characters));
  } catch (error) {
    console.error('Failed to persist custom characters:', error);
  }
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [ssoEmail, setSsoEmail] = useState('');
  const [isProcessingSSO, setIsProcessingSSO] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<'selector' | 'conversation' | 'history' | 'creator' | 'quests'>('selector');
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  // Fix: Add isSaving state to manage the end conversation flow.
  const [isSaving, setIsSaving] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);

  const userId = session?.user?.id;
  const customCharactersStorageKey = getUserScopedKey(CUSTOM_CHARACTERS_KEY, userId);
  const historyStorageKey = getUserScopedKey(HISTORY_KEY, userId);
  const completedQuestsStorageKey = getUserScopedKey(COMPLETED_QUESTS_KEY, userId);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.error('Failed to fetch auth session:', error);
          setAuthError('Unable to contact the authentication service. Please refresh and try again.');
          setSession(null);
        } else {
          setSession(data.session ?? null);
        }
      } catch (error) {
        console.error('Failed to fetch auth session:', error);
        if (isMounted) {
          setAuthError('Unable to contact the authentication service. Please refresh and try again.');
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        setAuthError(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let isActive = true;
    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, display_name, avatar_url, created_at')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!isActive) {
          return;
        }

        if (error) {
          throw error;
        }

        if (data) {
          setProfile({
            id: data.id,
            email: data.email ?? session.user.email ?? null,
            displayName:
              data.display_name ??
              (session.user.user_metadata?.full_name ?? session.user.email) ??
              null,
            avatarUrl: data.avatar_url ?? session.user.user_metadata?.avatar_url ?? null,
            createdAt: data.created_at ?? null,
          });
        } else {
          setProfile({
            id: session.user.id,
            email: session.user.email ?? null,
            displayName: session.user.user_metadata?.full_name ?? session.user.email ?? null,
            avatarUrl: session.user.user_metadata?.avatar_url ?? null,
            createdAt: null,
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        if (isActive) {
          setProfileError('We could not load your profile information. Some features may be unavailable.');
          setProfile({
            id: session.user.id,
            email: session.user.email ?? null,
            displayName: session.user.user_metadata?.full_name ?? session.user.email ?? null,
            avatarUrl: session.user.user_metadata?.avatar_url ?? null,
            createdAt: null,
          });
        }
      } finally {
        if (isActive) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isActive = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      setSelectedCharacter(null);
      setView('selector');
      setEnvironmentImageUrl(null);
      setActiveQuest(null);
      setCompletedQuests([]);
      setCustomCharacters([]);
      setLastQuestOutcome(null);
      return;
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      setSsoEmail('');
    }
  }, [session]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const storedCharacters = loadCustomCharacters(customCharactersStorageKey);
    setCustomCharacters(storedCharacters);

    const storedCompletedQuests = loadCompletedQuests(completedQuestsStorageKey);
    setCompletedQuests(storedCompletedQuests);

    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (characterId) {
      const allCharacters = [...storedCharacters, ...CHARACTERS];
      const characterFromUrl = allCharacters.find(c => c.id === characterId);
      if (characterFromUrl) {
        setSelectedCharacter(characterFromUrl);
        setView('conversation');
      }
    }
  }, [userId, customCharactersStorageKey, completedQuestsStorageKey]);

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

  const handleCharacterCreated = (newCharacter: Character) => {
    const updatedCharacters = [newCharacter, ...customCharacters];
    setCustomCharacters(updatedCharacters);
    saveCustomCharacters(customCharactersStorageKey, updatedCharacters);
    handleSelectCharacter(newCharacter);
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      const updatedCharacters = customCharacters.filter(c => c.id !== characterId);
      setCustomCharacters(updatedCharacters);
      saveCustomCharacters(customCharactersStorageKey, updatedCharacters);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);

    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to start Google sign-in:', error);
      setAuthError(error instanceof Error ? error.message : 'Unable to start Google sign-in. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSsoSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = ssoEmail.trim();
    const domain = trimmedEmail.split('@')[1];

    if (!domain) {
      setAuthError('Enter your work email to continue.');
      return;
    }

    setAuthError(null);
    setIsProcessingSSO(true);

    try {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to start SSO sign-in:', error);
      setAuthError(error instanceof Error ? error.message : 'Unable to start SSO sign-in. Please try again.');
    } finally {
      setIsProcessingSSO(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    } finally {
      setSsoEmail('');
    }
  };

  // Fix: Implement summary generation and state reset on conversation end.
  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter) return;
    setIsSaving(true);
    let questAssessment: QuestAssessment | null = null;

    try {
      const conversationHistory = loadConversations(historyStorageKey);
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

          if (questAssessment.passed) {
            setCompletedQuests(prev => {
              if (prev.includes(activeQuest.id)) {
                saveCompletedQuests(completedQuestsStorageKey, prev);
                return prev;
              }
              const updated = [...prev, activeQuest.id];
              saveCompletedQuests(completedQuestsStorageKey, updated);
              return updated;
            });
          } else {
            setCompletedQuests(prev => {
              if (!prev.includes(activeQuest.id)) {
                saveCompletedQuests(completedQuestsStorageKey, prev);
                return prev;
              }
              const updated = prev.filter(id => id !== activeQuest.id);
              saveCompletedQuests(completedQuestsStorageKey, updated);
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

      saveConversationToLocalStorage(historyStorageKey, updatedConversation);
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

  const profileDisplayName =
    (profile?.displayName && profile.displayName.trim()) ||
    profile?.email ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email ||
    'Explorer';

  const profileEmail = profile?.email ?? session?.user?.email ?? '';
  const profileInitial = profileDisplayName.charAt(0).toUpperCase() || '?';
  const showLoading = authLoading || (session && profileLoading);

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
            historyStorageKey={historyStorageKey}
          />
        ) : null;
      case 'history':
        return <HistoryView onBack={() => setView('selector')} storageKey={historyStorageKey} />;
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

  if (showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f] text-gray-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Preparing your learning space...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f] text-gray-200 p-4">
        <div className="w-full max-w-lg space-y-6 rounded-2xl border border-gray-800 bg-gray-900/80 p-8 shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-amber-300 tracking-wide">School of the Ancients</h1>
            <p className="text-sm text-gray-400">
              Sign in with your organization account to begin your journey.
            </p>
          </div>
          {authError && (
            <div className="rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-100">
              {authError}
            </div>
          )}
          <button
            onClick={handleGoogleSignIn}
            disabled={authLoading}
            className="w-full rounded-lg bg-amber-500 py-3 px-4 text-center text-base font-semibold text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Google
          </button>
          <div className="relative text-center text-xs uppercase tracking-wide text-gray-500">
            <span className="bg-gray-900 px-3">or</span>
            <span className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-gray-800" aria-hidden="true" />
          </div>
          <form onSubmit={handleSsoSignIn} className="space-y-3">
            <label htmlFor="sso-email" className="block text-sm font-semibold text-gray-300">
              Work email
            </label>
            <input
              id="sso-email"
              type="email"
              value={ssoEmail}
              onChange={event => {
                setSsoEmail(event.target.value);
                if (authError) {
                  setAuthError(null);
                }
              }}
              placeholder="you@yourcompany.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
            <button
              type="submit"
              disabled={isProcessingSSO}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-3 px-4 text-base font-semibold text-amber-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessingSSO ? 'Redirecting…' : 'Continue with SSO'}
            </button>
          </form>
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
        <header className="mb-8 flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider" style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}>
              School of the Ancients
            </h1>
            <p className="mt-2 text-lg text-gray-400">Old world wisdom. New world classroom.</p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-3 rounded-full border border-gray-700 bg-gray-800/60 px-3 py-2">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profileDisplayName}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-lg font-semibold text-amber-200">
                  {profileInitial}
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-semibold text-amber-200">{profileDisplayName}</p>
                {profileEmail && <p className="text-xs text-gray-400">{profileEmail}</p>}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-gray-700 sm:w-auto"
            >
              Sign out
            </button>
          </div>
        </header>
        {profileError && (
          <div className="mx-auto mb-6 w-full max-w-3xl rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-100">
            {profileError}
          </div>
        )}
        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
