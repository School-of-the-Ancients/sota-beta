
import React, { useState, useEffect } from 'react';
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
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const CUSTOM_CHARACTERS_KEY = 'school-of-the-ancients-custom-characters';
// Fix: Add history key constant for conversation management.
const HISTORY_KEY = 'school-of-the-ancients-history';
const COMPLETED_QUESTS_KEY = 'school-of-the-ancients-completed-quests';

// Fix: Add helper functions to manage conversation history in localStorage.
const loadConversations = (): SavedConversation[] => {
  try {
    const rawHistory = localStorage.getItem(HISTORY_KEY);
    return rawHistory ? JSON.parse(rawHistory) : [];
  } catch (error) {
    console.error("Failed to load conversation history:", error);
    return [];
  }
};

const saveConversationToLocalStorage = (conversation: SavedConversation) => {
  try {
    const history = loadConversations();
    const existingIndex = history.findIndex(c => c.id === conversation.id);
    if (existingIndex > -1) {
      history[existingIndex] = conversation;
    } else {
      history.unshift(conversation);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save conversation:", error);
  }
};

const loadCompletedQuests = (): string[] => {
  try {
    const stored = localStorage.getItem(COMPLETED_QUESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load completed quests:', error);
    return [];
  }
};

const saveCompletedQuests = (questIds: string[]) => {
  try {
    localStorage.setItem(COMPLETED_QUESTS_KEY, JSON.stringify(questIds));
  } catch (error) {
    console.error('Failed to save completed quests:', error);
  }
};

const App: React.FC = () => {
  const {
    user,
    profile,
    loading: authLoading,
    error: authError,
    signInWithGoogle,
    signOut,
  } = useSupabaseAuth();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<'selector' | 'conversation' | 'history' | 'creator' | 'quests'>('selector');
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  // Fix: Add isSaving state to manage the end conversation flow.
  const [isSaving, setIsSaving] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const accountName = profile?.displayName ?? profile?.email ?? user?.email ?? 'Adventurer';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-gray-100">
        <p className="text-lg font-semibold tracking-wide">Preparing your classroom...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-gray-100 p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-gray-900/60 border border-gray-700 rounded-2xl p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-amber-300 tracking-wide">School of the Ancients</h1>
          <p className="text-gray-300">Sign in to unlock saved conversations, quests, and progress tracking.</p>
          {authError && (
            <p className="text-sm text-red-400 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2">
              {authError}
            </p>
          )}
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            <span className="text-lg">Continue with Google</span>
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Load custom characters from local storage
    try {
      const storedCharacters = localStorage.getItem(CUSTOM_CHARACTERS_KEY);
      if (storedCharacters) {
        setCustomCharacters(JSON.parse(storedCharacters));
      }
    } catch (e) {
      console.error("Failed to load custom characters:", e);
    }

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

    setCompletedQuests(loadCompletedQuests());
  }, []); // customCharacters dependency is intentionally omitted to avoid re-running on delete

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
    try {
      localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updatedCharacters));
    } catch (e) {
      console.error("Failed to save custom character:", e);
    }
    handleSelectCharacter(newCharacter);
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      const updatedCharacters = customCharacters.filter(c => c.id !== characterId);
      setCustomCharacters(updatedCharacters);
      try {
        localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updatedCharacters));
      } catch (e) {
        console.error("Failed to delete custom character:", e);
      }
    }
  };

  // Fix: Implement summary generation and state reset on conversation end.
  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter) return;
    setIsSaving(true);
    let questAssessment: QuestAssessment | null = null;

    try {
      const conversationHistory = loadConversations();
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
                saveCompletedQuests(prev);
                return prev;
              }
              const updated = [...prev, activeQuest.id];
              saveCompletedQuests(updated);
              return updated;
            });
          } else {
            setCompletedQuests(prev => {
              if (!prev.includes(activeQuest.id)) {
                saveCompletedQuests(prev);
                return prev;
              }
              const updated = prev.filter(id => id !== activeQuest.id);
              saveCompletedQuests(updated);
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

      saveConversationToLocalStorage(updatedConversation);
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
            // Fix: Pass the isSaving prop to ConversationView.
            isSaving={isSaving}
          />
        ) : null;
      case 'history':
        return <HistoryView onBack={() => setView('selector')} />;
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
        <header className="relative text-center mb-8">
          <div className="absolute top-0 right-0 flex items-center gap-3 bg-gray-900/50 border border-gray-700 rounded-full pl-3 pr-4 py-2 shadow-lg">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={`${accountName}'s avatar`}
                className="w-10 h-10 rounded-full border border-amber-300 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border border-amber-300 bg-amber-500/20 flex items-center justify-center text-amber-200 font-semibold">
                {accountName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-end leading-tight">
              <span className="text-sm font-semibold text-amber-200">{accountName}</span>
              {profile?.email && (
                <span className="text-xs text-gray-300">{profile.email}</span>
              )}
              <button
                onClick={signOut}
                className="text-xs text-gray-400 hover:text-amber-300 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
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
