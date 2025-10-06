import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { ConnectionState, Quest } from '@/types';

// Mock @google/genai
const mockLiveSession = {
  sendRealtimeInput: vi.fn(),
  sendToolResponse: vi.fn(),
  close: vi.fn(),
};

const mockConnect = vi.fn((config: any) => Promise.resolve(mockLiveSession));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    live: {
      connect: mockConnect,
    },
  })),
  Modality: {
    AUDIO: 'AUDIO',
  },
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
  },
}));

// Mock browser APIs
const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
};

const mockGetUserMedia = vi.fn(() => Promise.resolve(mockMediaStream));

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

const mockScriptProcessor = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  onaudioprocess: null,
};

const mockAudioContext = {
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createScriptProcessor: vi.fn(() => mockScriptProcessor),
  destination: {},
  close: vi.fn(() => Promise.resolve()),
  resume: vi.fn(),
  suspend: vi.fn(),
  sampleRate: 16000,
};

// @ts-expect-error - Mocking AudioContext
window.AudioContext = vi.fn(() => mockAudioContext);

const mockOnTurnComplete = vi.fn();
const mockOnEnvironmentChangeRequest = vi.fn();
const mockOnArtifactDisplayRequest = vi.fn();
const mockQuest: Quest = {
    id: 'quest-1',
    title: 'The Socratic Method',
    objective: 'Understand the Socratic method.',
    duration: '15 minutes',
    description: 'Practice guided questioning with Socrates.',
    focusPoints: ['Asking questions', 'Challenging assumptions'],
    characterId: 'socrates',
};

describe('useGeminiLive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the mock implementation for connect to control callbacks for each test
        mockConnect.mockImplementation(({ callbacks }) => {
            // Postpone onopen to the next tick to simulate async connection
            Promise.resolve().then(() => callbacks.onopen());
            return Promise.resolve(mockLiveSession);
        });
    });

    it('should initialize with CONNECTING state and transition to LISTENING', async () => {
        const { result } = renderHook(() =>
            useGeminiLive(
                'system-instruction',
                'test-voice',
                mockOnTurnComplete,
                mockOnEnvironmentChangeRequest,
                mockOnArtifactDisplayRequest,
                null,
                'en-US',
            )
        );

        expect(result.current.connectionState).toBe(ConnectionState.CONNECTING);

        await waitFor(() => {
            expect(result.current.connectionState).toBe(ConnectionState.LISTENING);
        });

        expect(mockConnect).toHaveBeenCalled();
    });

    it('should handle sending a text message', async () => {
        const { result } = renderHook(() =>
            useGeminiLive(
                'system-instruction',
                'test-voice',
                mockOnTurnComplete,
                mockOnEnvironmentChangeRequest,
                mockOnArtifactDisplayRequest,
                null,
                'en-US',
            )
        );

        await waitFor(() => expect(result.current.connectionState).toBe(ConnectionState.LISTENING));

        act(() => {
            result.current.sendTextMessage('Hello, world!');
        });

        expect(result.current.connectionState).toBe(ConnectionState.THINKING);
        expect(mockOnTurnComplete).toHaveBeenCalledWith({ user: 'Hello, world!', model: '' });

        await waitFor(() => {
            expect(mockLiveSession.sendRealtimeInput).toHaveBeenCalledWith({ text: 'Hello, world!' });
        });
    });

    it('should handle incoming transcriptions and turn completion', async () => {
        let openCallback: () => void;
        let messageCallback: (msg: any) => void;

        mockConnect.mockImplementation(({ callbacks }) => {
            openCallback = callbacks.onopen;
            messageCallback = callbacks.onmessage;
            return Promise.resolve(mockLiveSession);
        });

        const { result } = renderHook(() =>
            useGeminiLive(
                'system-instruction',
                'test-voice',
                mockOnTurnComplete,
                mockOnEnvironmentChangeRequest,
                mockOnArtifactDisplayRequest,
                null,
                'en-US',
            )
        );

        await act(async () => {
            openCallback();
        });

        await act(async () => {
            messageCallback({ serverContent: { inputTranscription: { text: 'User says something. ' } } });
        });
        expect(result.current.userTranscription).toBe('User says something. ');

        await act(async () => {
            messageCallback({ serverContent: { outputTranscription: { text: 'Model responds.' } } });
        });
        expect(result.current.modelTranscription).toBe('Model responds.');
        expect(result.current.connectionState).toBe(ConnectionState.THINKING);

        await act(async () => {
            messageCallback({ serverContent: { turnComplete: true } });
        });

        expect(mockOnTurnComplete).toHaveBeenCalledWith({
            user: 'User says something. ',
            model: 'Model responds.',
        });
        expect(result.current.userTranscription).toBe('');
        expect(result.current.modelTranscription).toBe('');
    });

    it('should handle tool calls for environment changes', async () => {
        let openCallback: () => void;
        let messageCallback: (msg: any) => void;

        mockConnect.mockImplementation(({ callbacks }) => {
            openCallback = callbacks.onopen;
            messageCallback = callbacks.onmessage;
            return Promise.resolve(mockLiveSession);
        });

        renderHook(() =>
            useGeminiLive(
                'system-instruction',
                'test-voice',
                mockOnTurnComplete,
                mockOnEnvironmentChangeRequest,
                mockOnArtifactDisplayRequest,
                null,
                'en-US',
            )
        );

        await act(async () => {
            openCallback();
            messageCallback({
                toolCall: {
                    functionCalls: [{ id: 'fc-1', name: 'changeEnvironment', args: { description: 'A new world' } }]
                }
            });
        });

        expect(mockOnEnvironmentChangeRequest).toHaveBeenCalledWith('A new world');
        expect(mockLiveSession.sendToolResponse).toHaveBeenCalled();
    });

    it('should toggle microphone and update connection state', async () => {
        const { result } = renderHook(() =>
            useGeminiLive(
                'system-instruction',
                'test-voice',
                mockOnTurnComplete,
                mockOnEnvironmentChangeRequest,
                mockOnArtifactDisplayRequest,
                null,
                'en-US',
            )
        );

        await waitFor(() => expect(result.current.connectionState).toBe(ConnectionState.LISTENING));

        expect(result.current.isMicActive).toBe(true);
        expect(result.current.connectionState).toBe(ConnectionState.LISTENING);

        act(() => {
            result.current.toggleMicrophone();
        });

        expect(result.current.isMicActive).toBe(false);
        expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);

        act(() => {
            result.current.toggleMicrophone();
        });

        expect(result.current.isMicActive).toBe(true);
        expect(result.current.connectionState).toBe(ConnectionState.LISTENING);
    });

    it('should handle disconnect properly', async () => {
        const { result, unmount } = renderHook(() =>
            useGeminiLive(
                'system-instruction',
                'test-voice',
                mockOnTurnComplete,
                mockOnEnvironmentChangeRequest,
                mockOnArtifactDisplayRequest,
                null,
                'en-US',
            )
        );

        await waitFor(() => expect(result.current.connectionState).toBe(ConnectionState.LISTENING));

        unmount();

        await waitFor(() => {
            expect(mockLiveSession.close).toHaveBeenCalled();
        });

        expect(mockAudioContext.close).toHaveBeenCalled();
        // We cannot assert the state of an unmounted hook, but we have verified the cleanup functions were called.
    });

    it('should set state to DISCONNECTED on session close', async () => {
        let oncloseCallback: () => void;

        mockConnect.mockImplementation(({ callbacks }) => {
            Promise.resolve().then(() => {
                callbacks.onopen();
                oncloseCallback = callbacks.onclose;
            });
            return Promise.resolve(mockLiveSession);
        });

        const { result } = renderHook(() =>
            useGeminiLive(
                'system-instruction',
                'test-voice',
                mockOnTurnComplete,
                mockOnEnvironmentChangeRequest,
                mockOnArtifactDisplayRequest,
                null,
                'en-US',
            )
        );

        await waitFor(() => expect(result.current.connectionState).toBe(ConnectionState.LISTENING));

        act(() => {
            oncloseCallback();
        });

        await waitFor(() => {
            expect(result.current.connectionState).toBe(ConnectionState.DISCONNECTED);
        });
    });

    it('should include quest objective in system instructions if a quest is active', async () => {
        renderHook(() =>
            useGeminiLive(
                'system-instruction',
                'test-voice',
                mockOnTurnComplete,
                mockOnEnvironmentChangeRequest,
                mockOnArtifactDisplayRequest,
                mockQuest,
                'en-US',
            )
        );

        await waitFor(() => {
            expect(mockConnect).toHaveBeenCalled();
        });

        const lastCall = mockConnect.mock.calls[mockConnect.mock.calls.length - 1];
        const systemInstruction = lastCall?.[0]?.config?.systemInstruction ?? '';

        expect(systemInstruction).toContain(mockQuest.objective);
        expect(systemInstruction).toContain('system-instruction');
    });
});