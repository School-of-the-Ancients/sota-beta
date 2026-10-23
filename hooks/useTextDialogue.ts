import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ConnectionState, type Character, type ConversationTurn, type Quest } from '../types';
import { useApiKey } from './useApiKey';
import { buildTextDialogueRequest, extractTextDialogueReply } from '../src/lib/textDialogue';

interface UseTextDialogueArgs {
  character: Character;
  activeQuest: Quest | null;
  transcript: ConversationTurn[];
  onTurnComplete: (turn: { user: string; model: string }) => void;
}

export const useTextDialogue = ({
  character,
  activeQuest,
  transcript,
  onTurnComplete,
}: UseTextDialogueArgs) => {
  const { apiKey } = useApiKey();
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const latestTranscriptRef = useRef(transcript);
  const onTurnCompleteRef = useRef(onTurnComplete);

  useEffect(() => {
    latestTranscriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    onTurnCompleteRef.current = onTurnComplete;
  }, [onTurnComplete]);

  useEffect(() => {
    setConnectionState(apiKey ? ConnectionState.CONNECTED : ConnectionState.ERROR);
  }, [apiKey]);

  const sendTextMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    onTurnCompleteRef.current({ user: trimmed, model: '' });

    if (!apiKey) {
      onTurnCompleteRef.current({
        user: '',
        model: 'Add your Gemini API key in Settings to start the text-first dialogue.',
      });
      setConnectionState(ConnectionState.ERROR);
      return;
    }

    setConnectionState(ConnectionState.THINKING);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const request = buildTextDialogueRequest({
        character,
        activeQuest,
        transcript: latestTranscriptRef.current,
        userMessage: trimmed,
      });
      const response = await ai.models.generateContent(request);
      const reply = extractTextDialogueReply(response);
      onTurnCompleteRef.current({ user: '', model: reply });
      setConnectionState(ConnectionState.CONNECTED);
    } catch (error) {
      console.error('Failed to send text dialogue message:', error);
      onTurnCompleteRef.current({
        user: '',
        model: 'I hit a problem while forming a response. Please try again in a moment.',
      });
      setConnectionState(ConnectionState.ERROR);
    }
  }, [activeQuest, apiKey, character]);

  const toggleMicrophone = useCallback(() => {
    // Voice is now an optional layer. ConversationView owns the actual voice hook
    // and toggles into it when the learner asks for speech input.
  }, []);

  return {
    connectionState,
    userTranscription: '',
    modelTranscription: '',
    isMicActive: false,
    toggleMicrophone,
    sendTextMessage,
  };
};
