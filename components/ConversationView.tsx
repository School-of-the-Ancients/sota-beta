
import React, { useState, useCallback, useRef } from 'react';
import type { Character, ConversationTurn, SavedConversation } from '../types';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { ConnectionState } from '../types';
import MicrophoneIcon from './icons/MicrophoneIcon';
import WaveformIcon from './icons/WaveformIcon';
import ThinkingIcon from './icons/ThinkingIcon';

const HISTORY_KEY = 'sages-of-science-history';

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


interface ConversationViewProps {
  character: Character;
  onEndConversation: () => void;
}

const StatusIndicator: React.FC<{ state: ConnectionState }> = ({ state }) => {
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

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700 text-sm ${currentStatus.color}`}>
      {currentStatus.icon}
      <span>{currentStatus.text}</span>
    </div>
  );
};

const ConversationView: React.FC<ConversationViewProps> = ({ character, onEndConversation }) => {
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const sessionIdRef = useRef(`conv_${Date.now()}`);

  const handleTurnComplete = useCallback(({ user, model }: { user: string; model: string }) => {
    if (user.trim() || model.trim()) {
      setTranscript(prev => [
        ...prev,
        { speaker: 'user', speakerName: 'You', text: user },
        { speaker: 'model', speakerName: character.name, text: model },
      ]);
    }
  }, [character.name]);

  const { connectionState, userTranscription, modelTranscription } = useGeminiLive(character.systemInstruction, character.voiceName, handleTurnComplete);

  const handleSave = () => {
    if (transcript.length === 0) return;
    setSaveStatus('saving');
    const conversation: SavedConversation = {
      id: sessionIdRef.current,
      characterId: character.id,
      characterName: character.name,
      portraitUrl: character.portraitUrl,
      timestamp: Date.now(),
      transcript,
    };
    saveConversationToLocalStorage(conversation);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto bg-[#202020] p-6 rounded-2xl shadow-2xl border border-gray-700">
      <div className="lg:w-1/3 flex flex-col items-center text-center">
        <div className="relative w-64 h-64">
          <img
            src={character.portraitUrl}
            alt={character.name}
            className={`w-full h-full object-cover rounded-full border-4 ${connectionState === ConnectionState.SPEAKING ? 'border-teal-400' : 'border-amber-400'} shadow-lg filter grayscale sepia-[0.2] transition-all duration-300`}
          />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
             <StatusIndicator state={connectionState} />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-amber-200 mt-8">{character.name}</h2>
        <p className="text-gray-400 italic">{character.title}</p>
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={onEndConversation}
            className="bg-red-800/70 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 border border-red-700"
          >
            End
          </button>
          <button
            onClick={handleSave}
            disabled={transcript.length === 0 || saveStatus !== 'idle'}
            className="bg-green-800/70 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 border border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveStatus === 'idle' ? 'Save' : 'Saved!'}
          </button>
        </div>
      </div>
      <div className="lg:w-2/3 bg-gray-900/50 p-6 rounded-lg border border-gray-700 min-h-[24rem] flex flex-col">
        <h3 className="text-xl font-semibold mb-4 text-gray-300 border-b border-gray-700 pb-2">Conversation Transcript</h3>
        <div className="flex-grow space-y-4 overflow-y-auto pr-2">
            {transcript.map((turn, index) => (
              <div key={index} className={`p-3 rounded-lg border ${turn.speaker === 'user' ? 'bg-blue-900/20 border-blue-800/50' : 'bg-teal-900/20 border-teal-800/50'}`}>
                <p className={`font-bold text-sm mb-1 ${turn.speaker === 'user' ? 'text-blue-300' : 'text-teal-300'}`}>{turn.speakerName}</p>
                <p className="text-gray-300">{turn.text}</p>
              </div>
            ))}
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
      </div>
    </div>
  );
};

export default ConversationView;
