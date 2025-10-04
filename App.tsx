import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import QuestIcon from './components/icons/QuestIcon';
import QuestCreator from './components/QuestCreator'; // NEW

import { CHARACTERS, QUESTS } from './constants';

const CUSTOM_CHARACTERS_KEY = 'school-of-the-ancients-custom-characters';
const HISTORY_KEY = 'school-of-the-ancients-history';
const COMPLETED_QUESTS_KEY = 'school-of-the-ancients-completed-quests';
const CUSTOM_QUESTS_KEY = 'school-of-the-ancients-custom-quests';

// ---- Local storage helpers -------------------------------------------------

const loadConversations = (): SavedConversation[] => {
  try {
    const rawHistory = localStorage.getItem(HISTORY_KEY);
    return rawHistory ? JSON.parse(rawHistory) : [];
  } catch (error) {
    console.error('Failed to load conversation history:', error);
    return [];
  }
};

const saveConversationToLocalStorage = (conversation: SavedConversation) => {
  try {
    const history = loadConversations();
    const existingIndex = history.findIndex((c) => c.id === conversation.id);
    if (existingIndex > -1) {
      history[existingIndex] = conversation;
    } else {
      history.unshift(conversation);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save conversation:', error);
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

const loadCustomQuests = (): Quest[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_QUESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load custom quests:', error);
    return [];
  }
};

const saveCustomQuests = (quests: Quest[]) => {
  try {
    localStorage.setItem(CUSTOM_QUESTS_KEY, JSON.stringify(quests));
  } catch (error) {
    console.error('Failed to save custom quests:', error);
  }
};

// ---- App -------------------------------------------------------------------

const App: React.FC = () => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<
    'selector' | 'conversation' | 'history' | 'creator' | 'quests' | 'questCreator'
  >('selector');

  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [customQuests, setCustomQuests] = useState<Quest[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);

  // end-conversation save/AI-eval flag
  const [isSaving, setIsSaving] = useState(false);

  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [lastQuestOutcome, setLastQuestOutcome] = useState<QuestAssessment | null>(null);
  const [inProgressQuestIds, setInProgressQuestIds] = useState<string[]>([]);

  const allQuests = useMemo(() => [...customQuests, ...QUESTS], [customQuests]);

  const syncQuestProgress = useCallback(() => {
    const history = loadConversations();
    const inProgress = new Set<string>();
    history.forEach((conversation) => {
      if (!conversation.questId) return;
      if (conversation.questAssessment?.passed) return;
      if (conversation.transcript && conversation.transcript.length > 1) {
        inProgress.add(conversation.questId);
      }
    });
    setInProgressQuestIds(Array.from(inProgress));
  }, []);

  // On mount: load saved characters, url param character, and progress
  useEffect(() => {
    let loadedCustomCharacters: Character[] = [];
    let loadedCustomQuests: Quest[] = [];
    try {
      const storedCharacters = localStorage.getItem(CUSTOM_CHARACTERS_KEY);
      if (storedCharacters) {
        loadedCustomCharacters = JSON.parse(storedCharacters);
        setCustomCharacters(loadedCustomCharacters);
      }
    } catch (e) {
      console.error('Failed to load custom characters:', e);
    }

    loadedCustomQuests = loadCustomQuests();
    if (loadedCustomQuests.length > 0) {
      setCustomQuests(loadedCustomQuests);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (characterId) {
      const allCharacters = [...loadedCustomCharacters, ...CHARACTERS];
      const characterFromUrl = allCharacters.find((c) => c.id === characterId);
      if (characterFromUrl) {
        setSelectedCharacter(characterFromUrl);
        setView('conversation');
      }
    }

    setCompletedQuests(loadCompletedQuests());
    syncQuestProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncQuestProgress]);

  // ---- Navigation helpers ----

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    setActiveQuest(null); // clear any quest when directly picking a character
    setResumeConversationId(null);
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
      setResumeConversationId(null);
      const url = new URL(window.location.href);
      url.searchParams.set('character', characterForQuest.id);
      window.history.pushState({}, '', url);
    } else {
      console.error(`Character with ID ${quest.characterId} not found for the selected quest.`);
    }
  };

  const handleContinueQuest = (questId: string | undefined) => {
    if (!questId) {
      return;
    }
    const questToResume = allQuests.find((quest) => quest.id === questId);
    if (!questToResume) {
      console.warn(`Quest with ID ${questId} could not be found for continuation.`);
      return;
    }
    handleSelectQuest(questToResume);
  };

  const handleResumeConversation = (conversation: SavedConversation) => {
    const allCharacters = [...customCharacters, ...CHARACTERS];
    const characterToResume = allCharacters.find((c) => c.id === conversation.characterId);

    if (!characterToResume) {
      console.error(`Unable to resume conversation: character with ID ${conversation.characterId} not found.`);
      return;
    }

    setResumeConversationId(conversation.id);
    setSelectedCharacter(characterToResume);
    setEnvironmentImageUrl(conversation.environmentImageUrl || null);

    if (conversation.questId) {
      const questToResume = allQuests.find((quest) => quest.id === conversation.questId);
      if (questToResume) {
        setActiveQuest(questToResume);
      } else {
        console.warn(`Quest with ID ${conversation.questId} not found while resuming conversation.`);
        setActiveQuest(null);
      }
    } else {
      setActiveQuest(null);
    }

    setView('conversation');

    const url = new URL(window.location.href);
    url.searchParams.set('character', characterToResume.id);
    window.history.pushState({}, '', url);
  };

  const handleCharacterCreated = (newCharacter: Character) => {
    const updatedCharacters = [newCharacter, ...customCharacters];
    setCustomCharacters(updatedCharacters);
    try {
      localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updatedCharacters));
    } catch (e) {
      console.error('Failed to save custom character:', e);
    }
    handleSelectCharacter(newCharacter);
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      const updatedCharacters = customCharacters.filter((c) => c.id !== characterId);
      setCustomCharacters(updatedCharacters);
      try {
        localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updatedCharacters));
      } catch (e) {
        console.error('Failed to delete custom character:', e);
      }
    }
  };

  const handleDeleteQuest = (questId: string) => {
    setCustomQuests((prev) => {
      const updated = prev.filter((quest) => quest.id !== questId);
      if (updated.length !== prev.length) {
        saveCustomQuests(updated);
        return updated;
      }
      return prev;
    });

    setCompletedQuests((prev) => {
      if (!prev.includes(questId)) {
        return prev;
      }
      const updated = prev.filter((id) => id !== questId);
      saveCompletedQuests(updated);
      return updated;
    });

    setInProgressQuestIds((prev) => prev.filter((id) => id !== questId));

    setActiveQuest((prev) => (prev?.id === questId ? null : prev));
  };

  // NEW: handle a freshly-generated quest & mentor from QuestCreator
  const startGeneratedQuest = (quest: Quest, mentor: Character) => {
    setCustomQuests((prev) => {
      const existingIndex = prev.findIndex((q) => q.id === quest.id);
      let updated: Quest[];
      if (existingIndex > -1) {
        updated = [...prev];
        updated[existingIndex] = quest;
      } else {
        updated = [quest, ...prev];
      }
      saveCustomQuests(updated);
      return updated;
    });
    setActiveQuest(quest);
    setSelectedCharacter(mentor);
    setView('conversation');
    setResumeConversationId(null);
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
      const conversationHistory = loadConversations();
      const existingConversation = conversationHistory.find((c) => c.id === sessionId);

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
            setCompletedQuests((prev) => {
              if (prev.includes(activeQuest.id)) {
                saveCompletedQuests(prev);
                return prev;
              }
              const updated = [...prev, activeQuest.id]; // FIX
              saveCompletedQuests(updated);
              return updated;
            });
          } else {
            setCompletedQuests((prev) => {
              if (!prev.includes(activeQuest.id)) {
                saveCompletedQuests(prev);
                return prev;
              }
              const updated = prev.filter((id) => id !== activeQuest.id);
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
      syncQuestProgress();
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
      setResumeConversationId(null);
      window.history.pushState({}, '', window.location.pathname);
    }
  };

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
            resumeConversationId={resumeConversationId}
          />
        ) : null;
      case 'history':
        return (
          <HistoryView
            onBack={() => setView('selector')}
            onResumeConversation={handleResumeConversation}
          />
        );
      case 'creator':
        return <CharacterCreator onCharacterCreated={handleCharacterCreated} onBack={() => setView('selector')} />;
      case 'quests': {
        const allCharacters = [...customCharacters, ...CHARACTERS];
        return (
          <QuestsView
            onBack={() => setView('selector')}
            onSelectQuest={handleSelectQuest}
            quests={allQuests}
            characters={allCharacters}
            completedQuestIds={completedQuests}
            onCreateQuest={() => setView('questCreator')}
            inProgressQuestIds={inProgressQuestIds}
            onDeleteQuest={handleDeleteQuest}
            deletableQuestIds={customQuests.map((quest) => quest.id)}
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
              const updated = [newChar, ...customCharacters];
              setCustomCharacters(updated);
              try {
                localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updated));
              } catch {}
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
                {completedQuests.length} of {allQuests.length} quests completed
              </p>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (completedQuests.length / Math.max(allQuests.length, 1)) * 100
                      )
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

                {!lastQuestOutcome.passed && lastQuestOutcome.questId && (
                  <button
                    type="button"
                    onClick={() => handleContinueQuest(lastQuestOutcome.questId)}
                    className="mt-4 inline-flex items-center text-sm font-semibold text-amber-200 hover:text-amber-100 hover:underline focus:outline-none"
                  >
                    Continue quest?
                  </button>
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
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;
