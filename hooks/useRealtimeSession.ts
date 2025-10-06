import { useMemo } from 'react';
import { useGeminiLive } from './useGeminiLive';
import { useOpenAiRealtime } from './useOpenAiRealtime';
import type { Quest, RealtimeProvider } from '../types';

type TurnUpdateHandler = (turn: { user: string; model: string }) => void;

type RealtimeHookResult = ReturnType<typeof useGeminiLive>;

type SharedArgs = [
  systemInstruction: string,
  voiceName: string,
  voiceAccent: string | undefined,
  onTurnComplete: TurnUpdateHandler,
  onEnvironmentChangeRequest: (description: string) => void,
  onArtifactDisplayRequest: (name: string, description: string) => void,
  activeQuest: Quest | null,
];

const providers: Record<RealtimeProvider, (...args: SharedArgs) => RealtimeHookResult> = {
  gemini: useGeminiLive,
  openai: useOpenAiRealtime,
};

export const useRealtimeSession = (
  provider: RealtimeProvider,
  ...args: SharedArgs
): RealtimeHookResult => {
  const hook = useMemo(() => providers[provider], [provider]);
  return hook(...args);
};
