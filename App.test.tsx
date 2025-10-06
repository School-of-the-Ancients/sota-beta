import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import type { Character, UserData } from './types';
import { ConnectionState } from './types';
import { QUESTS } from './constants';
import { DEFAULT_USER_DATA } from './supabase/userData';

vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn(() =>
    Promise.resolve({ text: JSON.stringify({ suggestions: ['suggestion 1', 'suggestion 2', 'suggestion 3'] }) })
  );
  const mockGenerateImages = vi.fn(() =>
    Promise.resolve({ generatedImages: [{ image: { imageBytes: 'fake-image-bytes' } }] })
  );
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

const mockUser = {
  id: 'test-user',
  email: 'tester@example.com',
  user_metadata: { email: 'tester@example.com' },
};

vi.mock('./hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: mockUser,
    session: null,
    loading: false,
    isConfigured: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

type Listener = (data: UserData) => void;

const { userDataStore, setUserDataRef } = vi.hoisted(() => ({
  userDataStore: {
    current: null as unknown as UserData,
    listeners: new Set<Listener>(),
  },
  setUserDataRef: { current: (_next: UserData) => {} },
}));

vi.mock('./hooks/useUserData', () => {
  const React = require('react');

  const useUserData = () => {
    const initialData = userDataStore.current ?? { ...DEFAULT_USER_DATA };
    const [data, setData] = React.useState(initialData);

    React.useEffect(() => {
      if (!userDataStore.current) {
        userDataStore.current = initialData;
      }
    }, [initialData]);

    React.useEffect(() => {
      const listener: Listener = (next: UserData) => setData(next);
      userDataStore.listeners.add(listener);
      return () => {
        userDataStore.listeners.delete(listener);
      };
    }, []);

    const updateData = React.useCallback((updater: (prev: UserData) => UserData) => {
      userDataStore.current = updater(userDataStore.current);
      userDataStore.listeners.forEach((listener) => listener(userDataStore.current));
    }, []);

    const replaceData = React.useCallback((next: UserData) => {
      userDataStore.current = next;
      userDataStore.listeners.forEach((listener) => listener(userDataStore.current));
    }, []);

    const refresh = React.useCallback(async () => {
      // noop in tests
    }, []);

    return {
      data,
      loading: false,
      saving: false,
      error: null,
      updateData,
      replaceData,
      refresh,
    };
  };

  const setUserData = (next: UserData) => {
    userDataStore.current = next;
    userDataStore.listeners.forEach((listener) => listener(userDataStore.current));
  };

  setUserDataRef.current = setUserData;

  return {
    useUserData,
    __esModule: true,
    __setUserData: setUserData,
  };
});

const __setUserData = (next: UserData) => setUserDataRef.current(next);

Object.defineProperty(window, 'history', {
  value: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
  },
  writable: true,
});

const resetLocation = () => {
  Object.defineProperty(window, 'location', {
    value: {
      search: '',
    },
    writable: true,
  });
};

describe('App', () => {
  beforeEach(() => {
    __setUserData({ ...DEFAULT_USER_DATA });
    vi.clearAllMocks();
    resetLocation();

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

    __setUserData({
      ...DEFAULT_USER_DATA,
      customCharacters: [customCharacter],
    });

    Object.defineProperty(window, 'location', {
      value: {
        search: `?character=${customCharacter.id}`,
      },
      writable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: customCharacter.name })).toBeInTheDocument();
    });

    const endButtons = screen.getAllByRole('button', { name: /end/i });
    expect(endButtons[0]).toBeInTheDocument();
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

    __setUserData({
      ...DEFAULT_USER_DATA,
      customQuests: [customQuest],
      completedQuestIds: [],
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

    const backButton = await screen.findByRole('button', { name: /back to ancients/i });
    fireEvent.click(backButton);

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

    __setUserData({
      ...DEFAULT_USER_DATA,
      customQuests: [orphanQuest],
      customCharacters: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`0 of ${defaultQuestCount} quests completed`, 'i'))
      ).toBeInTheDocument();
    });
  });
});
