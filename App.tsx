
import React, { useState, useEffect } from 'react';
// Fix: Add necessary imports for summary generation and conversation saving.
import { GoogleGenAI, Type } from '@google/genai';
import type { Character, Quest, ConversationTurn, SavedConversation, Summary, QuestCheckResult } from './types';
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
const QUEST_PROGRESS_KEY = 'school-of-the-ancients-quest-progress';

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

const loadQuestProgress = (): string[] => {
  try {
    const stored = localStorage.getItem(QUEST_PROGRESS_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && Array.isArray(parsed.completedQuestIds)) {
      return parsed.completedQuestIds;
    }

    return [];
  } catch (error) {
    console.error('Failed to load quest progress:', error);
    return [];
  }
};

const saveQuestProgress = (completedQuestIds: string[]) => {
  try {
    const payload = { completedQuestIds };
    localStorage.setItem(QUEST_PROGRESS_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save quest progress:', error);
  }
};

const App: React.FC = () => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<'selector' | 'conversation' | 'history' | 'creator' | 'quests'>('selector');
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  // Fix: Add isSaving state to manage the end conversation flow.
  const [isSaving, setIsSaving] = useState(false);
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
  const [questCheckResult, setQuestCheckResult] = useState<QuestCheckResult | null>(null);

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

    const storedQuestProgress = loadQuestProgress();
    if (storedQuestProgress.length > 0) {
      setCompletedQuestIds(storedQuestProgress);
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
  }, []); // customCharacters dependency is intentionally omitted to avoid re-running on delete

  useEffect(() => {
    saveQuestProgress(completedQuestIds);
  }, [completedQuestIds]);

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

  const handleDismissQuestResult = () => {
    setQuestCheckResult(null);
  };

  // Fix: Implement summary generation and state reset on conversation end.
  const evaluateQuestKnowledge = async (quest: Quest, transcript: ConversationTurn[]) => {
    if (!process.env.API_KEY) {
      setQuestCheckResult({
        questId: quest.id,
        questTitle: quest.title,
        passed: false,
        feedback: 'Set your API key to enable knowledge checks for quests.',
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const transcriptText = transcript
      .filter(turn => turn.text && turn.text.trim())
      .map(turn => `${turn.speakerName}: ${turn.text}`)
      .join('\n\n');

    if (!transcriptText.trim()) {
      setQuestCheckResult({
        questId: quest.id,
        questTitle: quest.title,
        passed: false,
        feedback: 'The conversation transcript was empty, so the knowledge check could not be completed.',
      });
      return;
    }

    const prompt = `You are an expert tutor verifying whether a student has completed a learning quest. Use only the student's contributions (lines where the speaker is "You") to judge their understanding.\n\nQuest title: ${quest.title}\nQuest objective: ${quest.objective}\nKey focus points:${quest.focusPoints.map(point => `\n- ${point}`).join('')}\n\nTranscript:\n${transcriptText}\n\nDetermine whether the student demonstrated a clear understanding of the quest objective. Consider the accuracy, depth, and reflection in their answers. Return a JSON object with: \n- passed (boolean): true if the student met the objective.\n- feedback (string): an encouraging summary tailored to their performance.\n- evidence (array of strings, optional): specific student statements that support your decision.\n- nextSteps (array of strings, optional): concise suggestions for what the student should explore next if they did not pass.\nKeep the tone supportive and specific.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              passed: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING },
              evidence: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              nextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['passed', 'feedback'],
          },
        },
      });

      const parsed = JSON.parse(response.text);

      const questResult: QuestCheckResult = {
        questId: quest.id,
        questTitle: quest.title,
        passed: Boolean(parsed.passed),
        feedback: typeof parsed.feedback === 'string' && parsed.feedback.trim()
          ? parsed.feedback
          : 'Knowledge check completed.',
      };

      if (Array.isArray(parsed.evidence) && parsed.evidence.length > 0) {
        questResult.evidence = parsed.evidence;
      }

      if (Array.isArray(parsed.nextSteps) && parsed.nextSteps.length > 0) {
        questResult.nextSteps = parsed.nextSteps;
      }

      setQuestCheckResult(questResult);

      if (questResult.passed) {
        setCompletedQuestIds(prev => (prev.includes(quest.id) ? prev : [...prev, quest.id]));
      }
    } catch (error) {
      console.error('Failed to evaluate quest knowledge:', error);
      setQuestCheckResult({
        questId: quest.id,
        questTitle: quest.title,
        passed: false,
        feedback: 'We could not complete the knowledge check. Please try ending the quest again.',
      });
    }
  };

  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter) return;
    setIsSaving(true);
    const questForSession = activeQuest;

    try {
      const conversationHistory = loadConversations();
      const conversation = conversationHistory.find(c => c.id === sessionId);

      if (conversation && transcript.length > 1) {
        if (!process.env.API_KEY) {
          console.error("API_KEY not set, skipping summary generation.");
        } else {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const transcriptText = transcript
            .slice(1) // Exclude initial greeting
            .map(turn => `${turn.speakerName}: ${turn.text}`)
            .join('\n\n');

          if (transcriptText.trim()) {
            const prompt = `Please summarize the following educational dialogue with ${selectedCharacter.name}. Provide a concise one-paragraph overview of the key topics discussed, and then list 3-5 of the most important takeaways or concepts as bullet points.

Dialogue:
${transcriptText}`;

            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    overview: { type: Type.STRING, description: "A one-paragraph overview of the conversation." },
                    takeaways: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "A list of 3-5 key takeaways from the conversation."
                    }
                  },
                  required: ["overview", "takeaways"]
                },
              },
            });

            const summary: Summary = JSON.parse(response.text);
            const updatedConversation: SavedConversation = {
              ...conversation,
              summary,
              timestamp: Date.now(),
            };
            saveConversationToLocalStorage(updatedConversation);
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate summary:", error);
    }

    try {
      if (questForSession && transcript.length > 1) {
        await evaluateQuestKnowledge(questForSession, transcript);
      }
    } catch (error) {
      console.error('Failed to run quest knowledge check:', error);
    } finally {
      setIsSaving(false);
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
            completedQuestIds={completedQuestIds}
          />
        );
      case 'selector':
      default:
        return (
          <div className="text-center animate-fade-in">
            {questCheckResult && (
              <div
                className={`max-w-3xl mx-auto mb-8 text-left p-5 rounded-xl border ${
                  questCheckResult.passed
                    ? 'border-green-500/60 bg-green-900/30 text-green-100'
                    : 'border-amber-500/70 bg-amber-900/30 text-amber-50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold opacity-80">Quest Knowledge Check</p>
                    <h3 className="text-xl font-semibold mt-1 text-amber-100">{questCheckResult.questTitle}</h3>
                    <p className="mt-3 text-sm sm:text-base leading-relaxed">{questCheckResult.feedback}</p>
                  </div>
                  <button
                    onClick={handleDismissQuestResult}
                    className="text-xs uppercase tracking-wide font-semibold text-gray-200 bg-black/20 hover:bg-black/30 rounded-full px-3 py-1"
                  >
                    Dismiss
                  </button>
                </div>
                {questCheckResult.evidence && questCheckResult.evidence.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Evidence</p>
                    <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                      {questCheckResult.evidence.map((item, index) => (
                        <li key={`evidence-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {questCheckResult.nextSteps && questCheckResult.nextSteps.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Suggested Next Steps</p>
                    <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                      {questCheckResult.nextSteps.map((item, index) => (
                        <li key={`next-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
             <p className="max-w-3xl mx-auto mb-8 text-gray-400 text-lg">
                Engage in real-time voice conversations with legendary minds from history, or embark on a guided Learning Quest to master a new subject.
            </p>
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
