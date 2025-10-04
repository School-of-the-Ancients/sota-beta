import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Character, ConversationTurn, SavedConversation, Quest, QuestAssessment } from '../types';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useAmbientAudio } from '../hooks/useAmbientAudio';
import { ConnectionState } from '../types';
import { AMBIENCE_LIBRARY } from '../constants';
import MicrophoneIcon from './icons/MicrophoneIcon';
import MicrophoneOffIcon from './icons/MicrophoneOffIcon';
import WaveformIcon from './icons/WaveformIcon';
import ThinkingIcon from './icons/ThinkingIcon';
import SendIcon from './icons/SendIcon';
import MuteIcon from './icons/MuteIcon';
import UnmuteIcon from './icons/UnmuteIcon';

const HISTORY_KEY = 'school-of-the-ancients-history';

interface ConversationViewProps {
  character: Character;
  onEndConversation: (transcript: ConversationTurn[], sessionId: string) => void;
  environmentImageUrl: string | null;
  onEnvironmentUpdate: (url: string | null) => void;
  activeQuest: Quest | null;
  previousQuestOutcome?: QuestAssessment | null;
  isSaving: boolean;
}

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

const StatusIndicator: React.FC<{ state: ConnectionState; isMicActive: boolean }> = ({ state, isMicActive }) => {
  let statusText = 'Ready';
  let statusColor = 'text-gray-400';
  let statusIcon = <MicrophoneIcon className="w-5 h-5" />;

  if (!isMicActive && (state === ConnectionState.CONNECTED || state === ConnectionState.LISTENING || state === ConnectionState.IDLE)) {
    statusText = 'Muted';
    statusColor = 'text-gray-400';
    statusIcon = <MicrophoneOffIcon className="w-5 h-5" />;
  } else {
    const statusMap = {
        [ConnectionState.IDLE]: { text: 'Ready', color: 'text-gray-400', icon: <MicrophoneIcon className="w-5 h-5" /> },
        [ConnectionState.CONNECTING]: { text: 'Connecting...', color: 'text-amber-400', icon: <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div> },
        [ConnectionState.CONNECTED]: { text: 'Connected', color: 'text-green-400', icon: <div className="w-3 h-3 bg-green-400 rounded-full"></div> },
        [ConnectionState.LISTENING]: { text: 'Listening...', color: 'text-blue-400', icon: <MicrophoneIcon className="w-5 h-5 animate-pulse" /> },
        [ConnectionState.THINKING]: { text: 'Thinking...', color: 'text-purple-400', icon: <ThinkingIcon className="w-5 h-5 animate-pulse" /> },
        [ConnectionState.SPEAKING]: { text: 'Speaking...', color: 'text-teal-400', icon: <WaveformIcon className="w-5 h-5" /> },
        [ConnectionState.ERROR]: { text: 'Error', color: 'text-red-500', icon: <div className="w-3 h-3 bg-red-500 rounded-full"></div> },
        [ConnectionState.DISCONNECTED]: { text: 'Disconnected', color: 'text-gray-500', icon: <div className="w-3 h-3 bg-gray-500 rounded-full"></div> },
    };
    const currentStatus = statusMap[state] || statusMap[ConnectionState.IDLE];
    statusText = currentStatus.text;
    statusColor = currentStatus.color;
    statusIcon = currentStatus.icon;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700 text-sm ${statusColor}`}>
      {statusIcon}
      <span>{statusText}</span>
    </div>
  );
};

const ArtifactDisplay: React.FC<{ artifact: NonNullable<ConversationTurn['artifact']> }> = ({ artifact }) => {
    return (
      <div className="mt-2 border-t border-teal-800/50 pt-3">
        <p className="text-sm font-semibold text-teal-300 mb-2">{artifact.name}</p>
        {artifact.loading && (
          <div className="w-full aspect-[4/3] bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {artifact.imageUrl && !artifact.loading && (
          <img src={artifact.imageUrl} alt={artifact.name} className="w-full rounded-lg" />
        )}
      </div>
    );
  };

const ConversationView: React.FC<ConversationViewProps> = ({ character, onEndConversation, environmentImageUrl, onEnvironmentUpdate, activeQuest, previousQuestOutcome, isSaving }) => {
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [textInput, setTextInput] = useState('');
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');

  const questFeedback = useMemo(() => {
    if (!activeQuest || !previousQuestOutcome) {
      return null;
    }
    if (previousQuestOutcome.questId !== activeQuest.id) {
      return null;
    }
    return previousQuestOutcome;
  }, [activeQuest, previousQuestOutcome]);

  const initialAudioSrc = AMBIENCE_LIBRARY.find(a => a.tag === character.ambienceTag)?.audioSrc ?? null;
  const { isMuted: isAmbienceMuted, toggleMute: toggleAmbienceMute, changeTrack: changeAmbienceTrack } = useAmbientAudio(initialAudioSrc);

  const placeholders = useMemo(() => {
    const prompts = [
      "Or type a message...",
      `What would you like to ask ${character.name}?`,
    ];

    if (character.suggestedPrompts?.[0]) {
      const prompt1 = character.suggestedPrompts[0];
      const verb =
        prompt1.toLowerCase().startsWith('show me') ||
        prompt1.toLowerCase().startsWith('take me')
          ? 'saying'
          : 'asking';
      prompts.push(`Try ${verb}: "${prompt1}"`);
    }

    if (character.suggestedPrompts?.[1]) {
      const prompt2 = character.suggestedPrompts[1];
      const verb =
        prompt2.toLowerCase().startsWith('show me') ||
        prompt2.toLowerCase().startsWith('take me')
          ? 'saying'
          : 'asking';
      prompts.push(`Try ${verb}: "${prompt2}"`);
    }

    return prompts;
  }, [character.name, character.suggestedPrompts]);
  
  const [placeholder, setPlaceholder] = useState(placeholders[0]);

  const sessionIdRef = useRef(`conv_${character.id}_${Date.now()}`);

  // Load existing conversation or start a new one with a greeting
  useEffect(() => {
    const greetingTurn: ConversationTurn = {
      speaker: 'model',
      speakerName: character.name,
      text: character.greeting,
    };

    if (activeQuest) {
      const history = loadConversations();
      const existingQuestConversation = history.find(
        (c) => c.questId === activeQuest.id
      );
      if (existingQuestConversation && existingQuestConversation.transcript.length > 0) {
        setTranscript(existingQuestConversation.transcript);
        onEnvironmentUpdate(existingQuestConversation.environmentImageUrl || null);
        sessionIdRef.current = existingQuestConversation.id;
      } else {
        setTranscript([greetingTurn]);
        onEnvironmentUpdate(null);
        sessionIdRef.current = `quest_${activeQuest.id}_${Date.now()}`;
      }
    } else {
      const history = loadConversations();
      const existingConversation = history.find(c => c.characterId === character.id);
      if (existingConversation && existingConversation.transcript.length > 0) {
          setTranscript(existingConversation.transcript);
          onEnvironmentUpdate(existingConversation.environmentImageUrl || null);
          sessionIdRef.current = existingConversation.id; 
      } else {
          // This is a new conversation or an empty one from history
          setTranscript([greetingTurn]);
          onEnvironmentUpdate(null);
          sessionIdRef.current = existingConversation ? existingConversation.id : `conv_${character.id}_${Date.now()}`;
      }
    }
  }, [character, onEnvironmentUpdate, activeQuest]);

    // Cycle through placeholders for text input
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholder(prev => {
                const currentIndex = placeholders.indexOf(prev);
                return placeholders[(currentIndex + 1) % placeholders.length];
            });
        }, 4000);
        return () => clearInterval(interval);
    }, [placeholders]);


  const handleTurnComplete = useCallback(({ user, model }: { user: string; model: string }) => {
    const trimmedUser = user.trim();
    const trimmedModel = model.trim();

    if (!trimmedUser && !trimmedModel) {
      return;
    }

    setTranscript(prev => {
      const updatedTranscript = [...prev];

      if (trimmedUser) {
        const lastTurn = updatedTranscript[updatedTranscript.length - 1];
        const isDuplicateUserTurn =
          lastTurn?.speaker === 'user' &&
          lastTurn.speakerName === 'You' &&
          lastTurn.text === trimmedUser;

        if (!isDuplicateUserTurn) {
          updatedTranscript.push({ speaker: 'user', speakerName: 'You', text: trimmedUser });
        }
      }

      if (trimmedModel) {
        const lastTurn = updatedTranscript[updatedTranscript.length - 1];
        const isDuplicateModelTurn =
          lastTurn?.speaker === 'model' &&
          lastTurn.speakerName === character.name &&
          lastTurn.text === trimmedModel;

        if (!isDuplicateModelTurn) {
          updatedTranscript.push({ speaker: 'model', speakerName: character.name, text: trimmedModel });
        }
      }

      return updatedTranscript;
    });
  }, [character.name]);

  const handleEnvironmentChange = useCallback(async (description: string) => {
    const environmentArtifactId = `env_${Date.now()}`;
    
    setTranscript(prev => [...prev, {
      speaker: 'model',
      speakerName: 'Matrix Operator',
      text: `Loading Environment: ${description}`,
      artifact: {
        id: environmentArtifactId,
        name: description,
        imageUrl: '',
        loading: true,
      }
    }]);

    setIsGeneratingVisual(true);
    setGenerationMessage(`Entering ${description}...`);
    try {
      if (!process.env.API_KEY) throw new Error("API_KEY not set.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const imagePromise = ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A photorealistic, atmospheric, wide-angle background of: ${description}, depicted authentically for the era of ${character.name} (${character.timeframe}). Cinematic and dramatic lighting. The scene should be evocative and immersive, without people or text.`,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
      });

      const availableTags = AMBIENCE_LIBRARY.map(a => a.tag).join(', ');
      const audioTagPromise = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Based on the environment description: "${description}", select the single most fitting keyword from this list: ${availableTags}. Return ONLY the keyword.`
      });

      const [imageResponse, audioTagResponse] = await Promise.all([imagePromise, audioTagPromise]);
      
      const newTag = audioTagResponse.text.trim();
      const newAudioSrc = AMBIENCE_LIBRARY.find(a => a.tag === newTag)?.audioSrc;
      if (newAudioSrc) {
        changeAmbienceTrack(newAudioSrc);
      }
      
      if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
        const url = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
        onEnvironmentUpdate(url);
        setTranscript(prev => prev.map(turn => {
          if (turn.artifact?.id === environmentArtifactId) {
            return {
              ...turn,
              text: `Environment Set: ${description}`,
              artifact: { ...turn.artifact, imageUrl: url, loading: false }
            };
          }
          return turn;
        }));
      } else {
        console.error("Environment generation returned no images.");
        setTranscript(prev => prev.map(turn => {
            if (turn.artifact?.id === environmentArtifactId) {
                const newTurn = { ...turn };
                delete newTurn.artifact;
                newTurn.text = `Failed to load environment: ${description}`;
                return newTurn;
            }
            return turn;
        }));
      }
    } catch (err) {
      console.error("Failed to generate environment:", err);
      setTranscript(prev => prev.map(turn => {
        if (turn.artifact?.id === environmentArtifactId) {
            const newTurn = { ...turn };
            delete newTurn.artifact;
            newTurn.text = `Error loading environment: ${description}`;
            return newTurn;
        }
        return turn;
    }));
    } finally {
      setIsGeneratingVisual(false);
    }
  }, [onEnvironmentUpdate, character, changeAmbienceTrack]);

  const handleArtifactDisplay = useCallback(async (name: string, description: string) => {
    const artifactId = `artifact_${Date.now()}`;
    
    setTranscript(prev => [...prev, {
        speaker: 'model',
        speakerName: 'Matrix Operator',
        text: `Displaying: ${name}`,
        artifact: { id: artifactId, name, imageUrl: '', loading: true }
    }]);

    setIsGeneratingVisual(true);
    setGenerationMessage(`Creating ${name}...`);

    try {
        if (!process.env.API_KEY) throw new Error("API_KEY not set.");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A detailed, clear image of: a "${name}". ${description}. The artifact should be rendered in a style authentic to ${character.name}'s era and work (e.g., a da Vinci sketch, a 19th-century diagram, a classical Greek sculpture). Present it on a simple, non-distracting background like aged parchment or a museum display.`,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '4:3' },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const url = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
            setTranscript(prev => prev.map(turn => {
                if (turn.artifact?.id === artifactId) {
                    return { ...turn, text: name, artifact: { ...turn.artifact, imageUrl: url, loading: false } };
                }
                return turn;
            }));
        } else {
            console.error("Artifact generation returned no images.");
            setTranscript(prev => prev.map(turn => {
                if (turn.artifact?.id === artifactId) {
                  const newTurn = { ...turn };
                  delete newTurn.artifact;
                  newTurn.text = `Failed to create visual for ${name}`;
                  return newTurn;
                }
                return turn;
            }));
        }
    } catch (err) {
      console.error("Failed to generate artifact:", err);
      setTranscript(prev => prev.map(turn => {
        if (turn.artifact?.id === artifactId) {
          const newTurn = { ...turn };
          delete newTurn.artifact;
          newTurn.text = `Error creating visual for ${name}`;
          return newTurn;
        }
        return turn;
      }));
    } finally {
        setIsGeneratingVisual(false);
    }
  }, [character]);


  const {
    connectionState,
    userTranscription,
    modelTranscription,
    isMicActive,
    toggleMicrophone,
    sendTextMessage
  } = useGeminiLive(
    character.systemInstruction,
    character.voiceName,
    character.voiceAccent,
    handleTurnComplete,
    handleEnvironmentChange,
    handleArtifactDisplay,
    activeQuest,
  );

  const updateDynamicSuggestions = useCallback(async (currentTranscript: ConversationTurn[]) => {
    if (currentTranscript.length === 0) return;
    setIsFetchingSuggestions(true);
    try {
        if (!process.env.API_KEY) throw new Error("API_KEY not set.");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const contextTranscript = currentTranscript.slice(-4).map(turn => `${turn.speakerName}: ${turn.text}`).join('\n');

        const prompt = `You are an AI assistant helping a student engaged in a Socratic dialogue with ${character.name}. Based on the last part of the conversation below, generate three distinct prompts for the student to say next. The prompts should adhere to these pedagogical goals:
1. One prompt should challenge an assumption or ask for a deeper explanation (e.g., 'But what if...?', 'How is that different from...?').
2. One prompt should encourage personal reflection or application (e.g., 'How can I apply that idea today?', 'What's the biggest misconception about that?').
3. One prompt must be a visual or environmental command relevant to the topic (e.g., 'Show me a diagram of that,' 'Take us to the place where that happened.').
Ensure prompts are concise and intellectually stimulating.

Transcript:
${contextTranscript}
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["suggestions"]
                },
            },
        });

        const data = JSON.parse(response.text);
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setDynamicSuggestions(data.suggestions.slice(0, 3));
        }

    } catch (err) {
        console.error("Failed to fetch dynamic suggestions:", err);
    } finally {
        setIsFetchingSuggestions(false);
    }
  }, [character.name]);

  useEffect(() => {
    if (transcript.length > 0 && transcript[transcript.length - 1].speaker === 'model') {
      updateDynamicSuggestions(transcript);
    }
  }, [transcript, updateDynamicSuggestions]);

  // Auto-save conversation on transcript change
  useEffect(() => {
    if (transcript.length === 0 && !environmentImageUrl) return;

    const conversation: SavedConversation = {
      id: sessionIdRef.current,
      characterId: character.id,
      characterName: character.name,
      portraitUrl: character.portraitUrl,
      timestamp: Date.now(),
      transcript,
      environmentImageUrl: environmentImageUrl || undefined,
      ...(activeQuest
        ? {
            questId: activeQuest.id,
            questTitle: activeQuest.title,
          }
        : {}),
    };
    saveConversationToLocalStorage(conversation);
  }, [transcript, character, environmentImageUrl, activeQuest]);

  const handleReset = () => {
    if (transcript.length === 0 && !environmentImageUrl) return;
    if (window.confirm('Are you sure you want to reset this conversation? The current transcript and environment will be cleared.')) {
        const greetingTurn: ConversationTurn = {
            speaker: 'model',
            speakerName: character.name,
            text: character.greeting,
        };
        setTranscript([greetingTurn]);
        setDynamicSuggestions([]);
        onEnvironmentUpdate(null);
        
        const initialSrc = AMBIENCE_LIBRARY.find(a => a.tag === character.ambienceTag)?.audioSrc ?? null;
        changeAmbienceTrack(initialSrc);
        
        const clearedConversation: SavedConversation = {
            id: sessionIdRef.current,
            characterId: character.id,
            characterName: character.name,
            portraitUrl: character.portraitUrl,
            timestamp: Date.now(),
            transcript: [greetingTurn],
            environmentImageUrl: undefined,
            ...(activeQuest
              ? {
                  questId: activeQuest.id,
                  questTitle: activeQuest.title,
                }
              : {}),
        };
        saveConversationToLocalStorage(clearedConversation);
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
        sendTextMessage(textInput.trim());
        setTextInput('');
    }
  };

  return (
    <div 
        className="relative flex flex-col md:flex-row gap-4 md:gap-8 max-w-6xl mx-auto w-full flex-grow rounded-lg md:rounded-2xl shadow-2xl border border-gray-700 overflow-hidden bg-gray-900/60 backdrop-blur-lg transition-all duration-1000"
    >
      {isGeneratingVisual && (
         <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 rounded-lg md:rounded-2xl">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-amber-200 text-lg">{generationMessage}</p>
        </div>
      )}
      
      <div className="relative z-10 flex flex-col md:flex-row gap-4 md:gap-8 w-full p-2 sm:p-4 md:p-6">
        <div className="w-full md:w-1/3 md:max-w-sm flex flex-col items-center text-center">
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 flex-shrink-0">
                <img
                    src={character.portraitUrl}
                    alt={character.name}
                    className={`w-full h-full object-cover rounded-full border-4 ${connectionState === ConnectionState.SPEAKING ? 'border-teal-400' : 'border-amber-400'} shadow-lg filter grayscale sepia-[0.2] transition-all duration-300`}
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                    <StatusIndicator state={connectionState} isMicActive={isMicActive} />
                </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-amber-200 mt-8">{character.name}</h2>
            <p className="text-gray-400 italic">{character.title}</p>
            
            {activeQuest && (
                <div className="mt-4 p-4 w-full max-w-xs bg-amber-900/40 border border-amber-800/80 rounded-lg text-left animate-fade-in space-y-3">
                    <div>
                        <p className="font-bold text-amber-300 text-xs uppercase tracking-wide">Active Quest</p>
                        <p className="text-amber-100 text-lg font-semibold leading-snug">{activeQuest.title}</p>
                        <p className="text-amber-200/80 text-xs mt-1">Estimated {activeQuest.duration}</p>
                    </div>
                    <div>
                        <p className="text-amber-200 text-xs font-semibold uppercase tracking-wide mb-1">Objective</p>
                        <p className="text-amber-50/90 text-sm leading-relaxed">{activeQuest.objective}</p>
                    </div>
                    <div>
                        <p className="text-amber-200 text-xs font-semibold uppercase tracking-wide mb-1">Focus Points</p>
                        <ul className="list-disc list-inside space-y-1 text-amber-50/80 text-sm">
                            {activeQuest.focusPoints.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {questFeedback && (
              <div
                className={`mt-4 w-full max-w-xs text-left rounded-lg border p-4 space-y-3 animate-fade-in ${
                  questFeedback.passed
                    ? 'bg-emerald-900/40 border-emerald-800/70'
                    : 'bg-red-900/40 border-red-800/70'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-xs uppercase tracking-wide text-amber-200">Latest Feedback</p>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      questFeedback.passed
                        ? 'bg-emerald-600/80 text-emerald-50'
                        : 'bg-red-600/80 text-red-50'
                    }`}
                  >
                    {questFeedback.passed ? 'Completed' : 'Needs Review'}
                  </span>
                </div>
                {questFeedback.summary && (
                  <p className="text-sm leading-relaxed text-amber-50/90">{questFeedback.summary}</p>
                )}
                {!questFeedback.passed && questFeedback.improvements.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-200 mb-1">Focus When You Return</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-100/90">
                      {questFeedback.improvements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {questFeedback.evidence.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/90 mb-1">What Went Well</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-emerald-100/90">
                      {questFeedback.evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-6 text-left w-full max-w-xs">
            {transcript.length <= 1 ? (
                <div className="animate-fade-in">
                <h4 className="text-md font-bold text-amber-200 mb-2 text-center">Conversation Starters</h4>
                <div className="space-y-2">
                    {character.suggestedPrompts.map((prompt, i) => (
                    <button
                        key={i}
                        onClick={() => sendTextMessage(prompt)}
                        className="w-full text-sm text-left bg-gray-800/60 hover:bg-gray-700/80 p-3 rounded-lg transition-colors duration-200 border border-gray-700 text-gray-300 disabled:opacity-50"
                        disabled={connectionState !== ConnectionState.LISTENING && connectionState !== ConnectionState.CONNECTED}
                    >
                        <span className="text-amber-300 mr-2">»</span>
                        {prompt}
                    </button>
                    ))}
                </div>
                </div>
            ) : (
                <div className="animate-fade-in">
                <h4 className="text-md font-bold text-amber-200 mb-2 text-center">Topics to Explore</h4>
                {isFetchingSuggestions ? (
                    <div className="space-y-2">
                    <div className="w-full bg-gray-800/60 p-3 rounded-lg h-[44px] animate-pulse"></div>
                    <div className="w-full bg-gray-800/60 p-3 rounded-lg h-[44px] animate-pulse" style={{ animationDelay: '75ms' }}></div>
                    <div className="w-full bg-gray-800/60 p-3 rounded-lg h-[44px] animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    </div>
                ) : (
                    <div className="space-y-2">
                    {(dynamicSuggestions.length > 0 ? dynamicSuggestions : character.suggestedPrompts).map((prompt, i) => (
                        <button
                        key={i}
                        onClick={() => sendTextMessage(prompt)}
                        className="w-full text-sm text-left bg-gray-800/60 hover:bg-gray-700/80 p-3 rounded-lg transition-colors duration-200 border border-gray-700 text-gray-300 disabled:opacity-50"
                        disabled={connectionState !== ConnectionState.LISTENING && connectionState !== ConnectionState.CONNECTED}
                        >
                        <span className="text-amber-300 mr-2">»</span>
                        {prompt}
                        </button>
                    ))}
                    </div>
                )}
                </div>
            )}
            </div>

            <div className="flex items-center justify-center gap-4 mt-auto pt-6 flex-wrap">
              <button
                  onClick={() => onEndConversation(transcript, sessionIdRef.current)}
                  disabled={isSaving}
                  className="bg-red-800/70 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 border border-red-700 disabled:opacity-50 disabled:cursor-wait"
              >
                  {isSaving ? 'Saving...' : 'End'}
              </button>
              <button
                  onClick={handleReset}
                  disabled={transcript.length === 0 && !environmentImageUrl}
                  className="bg-amber-800/70 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 border border-amber-700 disabled:opacity-50"
              >
                  Reset
              </button>
              <div className="flex items-center gap-2">
                <button
                    onClick={() => toggleMicrophone()}
                    aria-label={isMicActive ? "Mute microphone" : "Unmute microphone"}
                    className={`p-2 rounded-full transition-colors duration-300 border ${isMicActive ? 'bg-blue-800/70 hover:bg-blue-700 border-blue-700' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}
                >
                    {isMicActive ? <MicrophoneIcon className="w-6 h-6 text-white" /> : <MicrophoneOffIcon className="w-6 h-6 text-white" />}
                </button>
                <button
                    onClick={toggleAmbienceMute}
                    aria-label={isAmbienceMuted ? "Unmute ambient sound" : "Mute ambient sound"}
                    className={`p-2 rounded-full transition-colors duration-300 border ${!isAmbienceMuted ? 'bg-green-800/70 hover:bg-green-700 border-green-700' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}
                >
                    {isAmbienceMuted ? <MuteIcon className="w-6 h-6 text-white" /> : <UnmuteIcon className="w-6 h-6 text-white" />}
                </button>
              </div>
            </div>
        </div>
        <div className="w-full md:w-2/3 bg-gray-900/50 p-4 rounded-lg border border-gray-700 h-[60vh] md:h-auto flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-2 flex-shrink-0">Conversation Transcript</h3>
            <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                {transcript.map((turn, index) => {
                    const isUser = turn.speaker === 'user';
                    const isOperator = turn.speakerName === 'Matrix Operator';
                    
                    const containerClasses = isUser 
                        ? 'bg-blue-900/20 border-blue-800/50' 
                        : isOperator
                            ? 'bg-gray-700/20 border-gray-600/50'
                            : 'bg-teal-900/20 border-teal-800/50';

                    const speakerNameClasses = isUser
                        ? 'text-blue-300'
                        : isOperator
                            ? 'text-amber-300'
                            : 'text-teal-300';

                    return (
                        <div key={index} className={`p-3 rounded-lg border ${containerClasses}`}>
                            <p className={`font-bold text-sm mb-1 ${speakerNameClasses}`}>{turn.speakerName}</p>
                            <p className="text-gray-300">{turn.text}</p>
                            {turn.artifact && <ArtifactDisplay artifact={turn.artifact} />}
                        </div>
                    );
                })}
                {(userTranscription || modelTranscription) && (
                <>
                    {userTranscription && (
                        <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-800/50 opacity-75">
                            <p className="font-bold text-sm mb-1 text-blue-300">You</p>
                            <p className="text-gray-300 min-h-[1.5rem]">{userTranscription}</p>
                        </div>
                    )}
                    {modelTranscription && (
                        <div className="p-3 rounded-lg bg-teal-900/20 border border-teal-800/50 opacity-75">
                            <p className="font-bold text-sm mb-1 text-teal-300">{character.name}</p>
                            <p className="text-gray-300 min-h-[1.5rem]">{modelTranscription}</p>
                        </div>
                    )}
                </>
                )}
            </div>
            <form onSubmit={handleSendText} className="mt-4 flex gap-2 flex-shrink-0">
                <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={isMicActive ? placeholder : "Type a message..."}
                    className="flex-grow bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                    disabled={connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.SPEAKING || connectionState === ConnectionState.THINKING }
                />
                <button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-500 text-black font-bold p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!textInput.trim() || connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.SPEAKING || connectionState === ConnectionState.THINKING }
                    aria-label="Send message"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default ConversationView;
