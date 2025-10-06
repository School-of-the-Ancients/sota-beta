import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import { ConnectionState, Character } from './types';
import { QUESTS } from './constants';
import type { UserStateRecord } from './services/userStateRepository';

// Mock dependencies
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn(() => Promise.resolve({
    text: JSON.stringify({ suggestions: ['suggestion 1', 'suggestion 2', 'suggestion 3'] }),
  }));

  const mockGenerateImages = vi.fn(() => Promise.resolve({
    generatedImages: [{ image: { imageBytes: 'fake-image-bytes' } }],
  }));

  return {
    GoogleGenAI: vi.fn(() => ({
      models: {
        generateContent: mockGenerateContent,
        generateImages: mockGenerateImages,
      },
    })),
    Type: {
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
      STRING: 'STRING',
    },
  };
});

vi.mock('./hooks/useGeminiLive', () => ({
  useGeminiLive: vi.fn(() => ({
    connectionState: ConnectionState.CONNECTED,
    userTranscription: '',
    modelTranscription: '',
    isMicActive: true,
    toggleMicrophone: vi.fn(),
    sendTextMessage: vi.fn(),
  })),
}));

Object.defineProperty(window, 'history', {
  value: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    location: {
        search: ''
    }
  },
  writable: true
});

function createDefaultState(): UserStateRecord {
  return {
    conversations: [],
    completedQuestIds: [],
    customQuests: [],
    customCharacters: [],
    lastQuizResult: null,
    activeQuestId: null,
  };
}

let mockUserState: UserStateRecord = createDefaultState();

const mockAuth = {
  session: { user: { id: 'test-user', email: 'tester@example.com' } },
  isLoading: false,
  error: null as string | null,
  authMode: 'signIn' as const,
  setAuthMode: vi.fn(),
  signIn: vi.fn(async () => undefined),
  signUp: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
  refreshSession: vi.fn(async () => undefined),
  isConfigured: true,
};

vi.mock('./hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => mockAuth,
}));

vi.mock('./services/userStateRepository', () => ({
  DEFAULT_USER_STATE: createDefaultState(),
  fetchUserState: vi.fn(async () => mockUserState),
  persistUserState: vi.fn(async (_userId: string, state: UserStateRecord) => {
    mockUserState = state;
  }),
}));

describe('App', () => {
  beforeEach(() => {
    mockUserState = createDefaultState();
    mockAuth.session = { user: { id: 'test-user', email: 'tester@example.com' } };
    mockAuth.error = null;
    mockAuth.authMode = 'signIn';
    vi.clearAllMocks();

    // Mock browser APIs
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null,
    });
    window.IntersectionObserver = mockIntersectionObserver;

    // @ts-expect-error
    window.AudioContext = vi.fn().mockImplementation(() => ({
        createGain: vi.fn(() => ({ gain: { setValueAtTime: vi.fn() }, connect: vi.fn() })),
        createBufferSource: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
        decodeAudioData: vi.fn(),
        resume: vi.fn(),
        suspend: vi.fn(),
    }));

    window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('should load a custom character from a URL parameter', async () => {
    const customCharacter: Character = {
      id: 'custom-char-1',
      name: 'Custom Character',
      title: 'A Test Persona',
      greeting: 'Hello from the test suite.',
      voiceName: 'test-voice',
      voiceAccent: 'en-US',
      systemInstruction: 'You are a test character.',
      portraitUrl: 'http://example.com/portrait.png',
      ambienceTag: 'none',
      suggestedPrompts: [],
    };

    mockUserState = {
      ...createDefaultState(),
      customCharacters: [customCharacter],
    };

    // Set up the URL search parameter
    Object.defineProperty(window, 'location', {
        value: {
            search: `?character=${customCharacter.id}`
        },
        writable: true
    });

    render(<App />);

    // The app should switch to the conversation view and display the character's name
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: customCharacter.name })).toBeInTheDocument();
    });

    // A button unique to the conversation view should be present
    expect(await screen.findByRole('button', { name: 'End' })).toBeInTheDocument();
  });

  it('updates quest progress when a custom quest is deleted', async () => {
    const defaultQuestCount = QUESTS.length;
    const customQuest = {
      id: 'quest_test_custom',
      title: 'Custom Quest for Testing',
      description: 'A quest created during tests.',
      objective: 'Verify quest deletion updates progress.',
      focusPoints: ['Understand the deletion flow'],
      duration: '5 minutes',
      characterId: 'davinci',
    };

    mockUserState = {
      ...createDefaultState(),
      customQuests: [customQuest],
    };

    Object.defineProperty(window, 'location', {
      value: {
        search: '',
      },
      writable: true,
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`0 of ${defaultQuestCount + 1} quests completed`, 'i'))
      ).toBeInTheDocument();
    });

    const questViewButton = screen.getByRole('button', { name: /learning quests/i });
    fireEvent.click(questViewButton);

    const deleteButton = await screen.findByRole('button', { name: /delete quest/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`0 of ${defaultQuestCount} quests completed`, 'i'))
      ).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it('drops orphaned custom quests that reference missing characters', async () => {
    const defaultQuestCount = QUESTS.length;
    const orphanQuest = {
      id: 'quest_orphan',
      title: 'Ghost Quest',
      description: 'This quest references a character that no longer exists.',
      objective: 'Ensure cleanup runs.',
      focusPoints: ['Clean up stale quests'],
      duration: '5 minutes',
      characterId: 'custom_missing_character',
    };

    mockUserState = {
      ...createDefaultState(),
      customQuests: [orphanQuest],
      completedQuestIds: [orphanQuest.id],
    };

    Object.defineProperty(window, 'location', {
      value: {
        search: '',
      },
      writable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`0 of ${defaultQuestCount} quests completed`, 'i'))
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockUserState.customQuests).toHaveLength(0);
      expect(mockUserState.completedQuestIds).toHaveLength(0);
    });
  });
});

