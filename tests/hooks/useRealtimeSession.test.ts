import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

const geminiResult = {
  connectionState: 'gemini',
  userTranscription: '',
  modelTranscription: '',
  isMicActive: true,
  toggleMicrophone: vi.fn(),
  sendTextMessage: vi.fn(),
};

const openAiResult = {
  connectionState: 'openai',
  userTranscription: '',
  modelTranscription: '',
  isMicActive: true,
  toggleMicrophone: vi.fn(),
  sendTextMessage: vi.fn(),
};

const useGeminiLiveMock = vi.fn(() => geminiResult);
const useOpenAiRealtimeMock = vi.fn(() => openAiResult);

vi.mock('../../hooks/useGeminiLive', () => ({
  useGeminiLive: (...args: unknown[]) => useGeminiLiveMock(...args),
}));

vi.mock('../../hooks/useOpenAiRealtime', () => ({
  useOpenAiRealtime: (...args: unknown[]) => useOpenAiRealtimeMock(...args),
}));

describe('useRealtimeSession', () => {
  const baseArgs: [string, string, string | undefined, (turn: { user: string; model: string }) => void, (description: string) => void, (name: string, description: string) => void, null] = [
    'instruction',
    'voice',
    'accent',
    vi.fn(),
    vi.fn(),
    vi.fn(),
    null,
  ];

  it('delegates to the Gemini hook when provider is gemini', () => {
    const { result } = renderHook(() => useRealtimeSession('gemini', ...baseArgs));
    expect(result.current).toBe(geminiResult);
    expect(useGeminiLiveMock).toHaveBeenCalledTimes(1);
    expect(useGeminiLiveMock).toHaveBeenCalledWith(...baseArgs);
    expect(useOpenAiRealtimeMock).not.toHaveBeenCalled();
  });

  it('delegates to the OpenAI hook when provider is openai', () => {
    const { result } = renderHook(() => useRealtimeSession('openai', ...baseArgs));
    expect(result.current).toBe(openAiResult);
    expect(useOpenAiRealtimeMock).toHaveBeenCalledTimes(1);
    expect(useOpenAiRealtimeMock).toHaveBeenCalledWith(...baseArgs);
  });
});
