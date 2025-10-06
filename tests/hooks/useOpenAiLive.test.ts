import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOpenAiLive } from '../../hooks/useOpenAiLive';
import { ConnectionState, Quest } from '../../types';

const mockRealtimeConnect = vi.fn(() => Promise.resolve());
const mockUpdateSession = vi.fn();
const mockWaitForSessionCreated = vi.fn(() => Promise.resolve());
const mockAddTool = vi.fn();
const mockAppendInputAudio = vi.fn();
const mockSendUserMessageContent = vi.fn();
const mockDisconnect = vi.fn();

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
  onaudioprocess: null as ((event: any) => void) | null,
};

const mockAudioContext = {
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createScriptProcessor: vi.fn(() => mockScriptProcessor),
  createGain: vi.fn(() => ({ gain: { value: 0 }, connect: vi.fn() })),
  destination: {},
  close: vi.fn(() => Promise.resolve()),
  resume: vi.fn(),
  suspend: vi.fn(),
  currentTime: 0,
};

// @ts-expect-error - Mocking AudioContext
window.AudioContext = vi.fn(() => mockAudioContext);

const clientHandlers: Record<string, (payload: any) => void> = {};
vi.mock('@openai/realtime-api-beta', () => ({
  RealtimeClient: class {
    realtime = {
      connect: mockRealtimeConnect,
      on: vi.fn((event: string, handler: (payload: any) => void) => {
        if (event === 'close') {
          clientHandlers[`realtime.${event}`] = handler;
        }
      }),
    };

    appendInputAudio = mockAppendInputAudio;
    sendUserMessageContent = mockSendUserMessageContent;
    updateSession = mockUpdateSession;
    waitForSessionCreated = mockWaitForSessionCreated;
    addTool = mockAddTool;
    disconnect = mockDisconnect;

    on(event: string, handler: (payload: any) => void) {
      clientHandlers[event] = handler;
    }
  },
}));

const mockOnTurnComplete = vi.fn();
const mockOnEnvironmentChangeRequest = vi.fn();
const mockOnArtifactDisplayRequest = vi.fn();

const mockQuest: Quest = {
  id: 'quest-1',
  title: 'Quest Title',
  objective: 'Understand something important.',
  description: 'A test quest.',
  focusPoints: ['Point A', 'Point B'],
  duration: '10 minutes',
  characterId: 'char-1',
};

describe('useOpenAiLive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(clientHandlers).forEach(key => delete clientHandlers[key]);
    process.env.OPENAI_API_KEY = 'test-openai-key';

    mockRealtimeConnect.mockImplementation(() => Promise.resolve());
    mockWaitForSessionCreated.mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('initializes connection and transitions to LISTENING', async () => {
    const { result } = renderHook(() =>
      useOpenAiLive(
        'system instruction',
        'test-voice',
        'en-US',
        mockOnTurnComplete,
        mockOnEnvironmentChangeRequest,
        mockOnArtifactDisplayRequest,
        mockQuest,
      ),
    );

    expect(result.current.connectionState).toBe(ConnectionState.CONNECTING);

    await waitFor(() => {
      expect(result.current.connectionState).toBe(ConnectionState.LISTENING);
    });

    expect(mockRealtimeConnect).toHaveBeenCalled();
    expect(mockUpdateSession).toHaveBeenCalled();
  });

  it('sends text messages through the realtime client', async () => {
    const { result } = renderHook(() =>
      useOpenAiLive(
        'system instruction',
        'test-voice',
        'en-US',
        mockOnTurnComplete,
        mockOnEnvironmentChangeRequest,
        mockOnArtifactDisplayRequest,
        null,
      ),
    );

    await waitFor(() => {
      expect(result.current.connectionState).toBe(ConnectionState.LISTENING);
    });

    act(() => {
      result.current.sendTextMessage('Hello OpenAI');
    });

    expect(mockSendUserMessageContent).toHaveBeenCalledWith([{ type: 'input_text', text: 'Hello OpenAI' }]);
  });

  it('updates transcription when receiving conversation updates', async () => {
    const { result } = renderHook(() =>
      useOpenAiLive(
        'system instruction',
        'test-voice',
        'en-US',
        mockOnTurnComplete,
        mockOnEnvironmentChangeRequest,
        mockOnArtifactDisplayRequest,
        null,
      ),
    );

    await waitFor(() => {
      expect(result.current.connectionState).toBe(ConnectionState.LISTENING);
    });

    await act(async () => {
      clientHandlers['conversation.updated']?.({
        item: { role: 'assistant', formatted: { text: '' } },
        delta: { text: 'Hello there' },
      });
    });

    expect(result.current.modelTranscription).toContain('Hello there');

    await act(async () => {
      clientHandlers['conversation.item.completed']?.({
        item: { role: 'assistant', formatted: { text: 'Hello there' } },
      });
    });

    expect(mockOnTurnComplete).toHaveBeenCalledWith({ user: '', model: 'Hello there' });
  });

  it('disconnects when disabled', async () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useOpenAiLive(
          'system instruction',
          'test-voice',
          'en-US',
          mockOnTurnComplete,
          mockOnEnvironmentChangeRequest,
          mockOnArtifactDisplayRequest,
          null,
          enabled,
        ),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => {
      expect(mockRealtimeConnect).toHaveBeenCalled();
    });

    rerender({ enabled: false });

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
