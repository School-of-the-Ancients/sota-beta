
import React, { useState, useEffect } from 'react';
// Fix: Add necessary imports for summary generation and conversation saving.
import { GoogleGenAI, Type } from '@google/genai';
import type { Character, Quest, ConversationTurn, SavedConversation, Summary, QuestAssessment } from './types';
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
const QUEST_COMPLETIONS_KEY = 'school-of-the-ancients-quest-completions';

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
    const raw = localStorage.getItem(QUEST_COMPLETIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to load completed quests:', error);
    return [];
  }
};

const saveCompletedQuests = (questIds: string[]) => {
  try {
    localStorage.setItem(QUEST_COMPLETIONS_KEY, JSON.stringify(questIds));
  } catch (error) {
    console.error('Failed to save completed quests:', error);
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
  const [lastQuestResult, setLastQuestResult] = useState<QuestAssessment | null>(null);

  useEffect(() => {
    setCompletedQuestIds(loadCompletedQuests());
  }, []);

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

  const handleDismissQuestResult = () => {
    setLastQuestResult(null);
  };

  // Fix: Implement summary generation, quest evaluation, and state reset on conversation end.
  const handleEndConversation = async (transcript: ConversationTurn[], sessionId: string) => {
    if (!selectedCharacter) return;
    setIsSaving(true);
    const questAtEnd = activeQuest;
    let questContext: Quest | null = questAtEnd || null;
    let questAssessment: QuestAssessment | null = null;

    try {
      const conversationHistory = loadConversations();
      const conversation = conversationHistory.find(c => c.id === sessionId);
      const questForAssessment = questAtEnd || (conversation?.questId ? QUESTS.find(q => q.id === conversation.questId) || null : null);
      questContext = questForAssessment;

      const hasUserContribution = transcript.some(turn => turn.speaker === 'user' && turn.text.trim().length > 0);
      const hasSubstantiveTranscript = transcript.length > 1 && hasUserContribution;
      const transcriptText = transcript
        .slice(1)
        .map(turn => `${turn.speakerName}: ${turn.text}`)
        .join('\n\n');

      let aiClient: GoogleGenAI | null = null;
      if (process.env.API_KEY) {
        aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
      } else if (hasSubstantiveTranscript) {
        console.error('API_KEY not set, skipping AI-powered evaluation.');
      }

      if (questForAssessment) {
        if (!hasSubstantiveTranscript) {
          questAssessment = {
            questId: questForAssessment.id,
            questTitle: questForAssessment.title,
            passed: false,
            feedback: 'The conversation was too brief to judge mastery. Try discussing the focus points with your mentor and then end the quest again.',
            evidence: [],
          };
        } else if (!aiClient) {
          questAssessment = {
            questId: questForAssessment.id,
            questTitle: questForAssessment.title,
            passed: false,
            feedback: 'Knowledge check unavailable because the AI key is not configured. Please try again once it is set.',
            evidence: [],
          };
        } else {
          try {
            const prompt = `You are an educational evaluator. Determine whether the student successfully completed the quest "${questForAssessment.title}" with the objective: "${questForAssessment.objective}". Consider the focus points: ${questForAssessment.focusPoints.join('; ')}.

Review the transcript of the mentor and student below. Pass the student only if their own words show clear understanding, explanation, or application of the quest objective. Provide encouraging feedback even when they pass, and offer specific next steps when they do not.

Return JSON with:
- passed: boolean (true only when understanding is demonstrated)
- feedback: string (2-3 sentences of constructive feedback tailored to the result)
- evidence: array of 1-3 short bullet-style strings citing the student's contributions or gaps.

Transcript:
${transcriptText}`;

            const response = await aiClient.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    passed: { type: Type.BOOLEAN },
                    feedback: { type: Type.STRING },
                    evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['passed', 'feedback'],
                },
              },
            });

            const data = JSON.parse(response.text);
            questAssessment = {
              questId: questForAssessment.id,
              questTitle: questForAssessment.title,
              passed: Boolean(data.passed),
              feedback: data.feedback || 'Great work today! Keep exploring the topic to deepen your mastery.',
              evidence: Array.isArray(data.evidence) ? data.evidence : [],
            };
          } catch (error) {
            console.error('Failed to evaluate quest knowledge:', error);
            questAssessment = {
              questId: questForAssessment.id,
              questTitle: questForAssessment.title,
              passed: false,
              feedback: 'Knowledge check could not be completed due to an unexpected error. Please try ending the quest again.',
              evidence: [],
            };
          }
        }
      }

      let summary: Summary | undefined;
      if (conversation && hasSubstantiveTranscript) {
        if (!aiClient) {
          console.error('API_KEY not set, skipping summary generation.');
        } else {
          try {
            const prompt = `Please summarize the following educational dialogue with ${selectedCharacter.name}. Provide a concise one-paragraph overview of the key topics discussed, and then list 3-5 of the most important takeaways or concepts as bullet points.

Dialogue:
${transcriptText}`;

            const response = await aiClient.models.generateContent({
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

            summary = JSON.parse(response.text) as Summary;
          } catch (error) {
            console.error('Failed to generate summary:', error);
          }
        }
      }

      if (conversation) {
        const updatedConversation: SavedConversation = {
          ...conversation,
          summary: summary ?? conversation.summary,
          timestamp: Date.now(),
          transcript,
          questId: questForAssessment?.id ?? conversation.questId,
          questTitle: questForAssessment?.title ?? conversation.questTitle,
          questAssessment: questAssessment ?? conversation.questAssessment,
        };
        saveConversationToLocalStorage(updatedConversation);
      }

      if (questAssessment) {
        setLastQuestResult(questAssessment);
        if (questAssessment.passed) {
          const questId = questAssessment.questId;
          setCompletedQuestIds(prev => {
            if (prev.includes(questId)) {
              return prev;
            }
            const updated = [...prev, questId];
            saveCompletedQuests(updated);
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Failed to finalize conversation:', error);
      if (questContext) {
        setLastQuestResult({
          questId: questContext.id,
          questTitle: questContext.title,
          passed: false,
          feedback: 'Knowledge check could not be completed due to an unexpected error. Please try ending the quest again.',
          evidence: [],
        });
      }
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
            latestResult={lastQuestResult}
            onDismissResult={handleDismissQuestResult}
          />
        );
      case 'selector':
      default:
        return (
          <div className="text-center animate-fade-in">
            {lastQuestResult && (
              <div
                className={`max-w-3xl mx-auto mb-8 p-5 rounded-lg border text-left ${
                  lastQuestResult.passed
                    ? 'border-emerald-500/70 bg-emerald-900/30'
                    : 'border-amber-500/70 bg-amber-900/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">
                      {lastQuestResult.passed ? 'Quest Completed' : 'Quest Review Needed'}
                    </p>
                    <h3 className="text-2xl font-bold text-amber-100 mt-1">
                      {lastQuestResult.questTitle}
                    </h3>
                  </div>
                  <button
                    onClick={handleDismissQuestResult}
                    className="text-xs font-semibold text-gray-300 hover:text-white bg-gray-800/60 border border-gray-700 px-3 py-1 rounded-md transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-gray-200 mt-3 leading-relaxed">{lastQuestResult.feedback}</p>
                {lastQuestResult.evidence.length > 0 && (
                  <ul className="list-disc list-inside mt-3 space-y-1 text-sm text-gray-200/90">
                    {lastQuestResult.evidence.map((item, index) => (
                      <li key={`${lastQuestResult.questId}-evidence-${index}`}>{item}</li>
                    ))}
                  </ul>
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
