import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import { ConnectionState, Character } from './types';
import { QUESTS } from './constants';

// Mock dependencies
const mockGenerateContent = vi.fn();
const mockGenerateImages = vi.fn();

vi.mock('@google/genai', () => ({
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
}));

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

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

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

describe('App', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
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

    // Set up localStorage with the custom character
    mockLocalStorage.setItem(
      'school-of-the-ancients-custom-characters',
      JSON.stringify([customCharacter])
    );

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
    expect(screen.getByRole('button', { name: 'End' })).toBeInTheDocument();
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

    mockLocalStorage.setItem(
      'school-of-the-ancients-custom-quests',
      JSON.stringify([customQuest])
    );
    mockLocalStorage.setItem('school-of-the-ancients-completed-quests', JSON.stringify([]));
    mockLocalStorage.setItem('school-of-the-ancients-custom-characters', JSON.stringify([]));

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

    mockLocalStorage.setItem(
      'school-of-the-ancients-custom-quests',
      JSON.stringify([orphanQuest])
    );
    mockLocalStorage.setItem(
      'school-of-the-ancients-completed-quests',
      JSON.stringify([orphanQuest.id])
    );
    mockLocalStorage.setItem('school-of-the-ancients-custom-characters', JSON.stringify([]));

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

    expect(mockLocalStorage.getItem('school-of-the-ancients-custom-quests')).toBe(JSON.stringify([]));
    expect(mockLocalStorage.getItem('school-of-the-ancients-completed-quests')).toBe(JSON.stringify([]));
  });

  it('does not un-complete a quest if a user fails it after initially passing', async () => {
    const questToTest = QUESTS[0];
    const characterForQuest = {
      id: questToTest.characterId,
      name: 'Test Character',
      title: 'A Test Persona',
      greeting: 'Hello!',
      voiceName: 'test-voice',
      voiceAccent: 'en-US',
      systemInstruction: 'You are a test character.',
      portraitUrl: '',
      ambienceTag: 'none',
      suggestedPrompts: [],
    };

    // 1. Initial state: The quest is already completed.
    mockLocalStorage.setItem('school-of-the-ancients-completed-quests', JSON.stringify([questToTest.id]));
    mockLocalStorage.setItem('school-of-the-ancients-active-quest-id', questToTest.id);
    // The character is part of the default set, so we don't need to add it as a custom character.
    // This prevents a duplicate key warning in React when the character selector is rendered.
    mockLocalStorage.setItem('school-of-the-ancients-custom-characters', JSON.stringify([]));

    // 2. Mock a failed AI assessment for the quest.
    const mockFailedAssessment = {
      passed: false,
      summary: 'The student did not demonstrate understanding.',
      evidence: [],
      improvements: ['Review the core concepts.'],
    };
    const mockSummary = {
      overview: 'A brief conversation.',
      takeaways: ['A key point.'],
    };
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify(mockSummary) })
      .mockResolvedValueOnce({ text: JSON.stringify(mockFailedAssessment) });

    // Set up the URL to trigger the conversation view with the right character
    Object.defineProperty(window, 'location', {
      value: {
        search: `?character=${characterForQuest.id}`,
      },
      writable: true,
    });

    render(<App />);

    // 3. Find the "End" button and click it to trigger handleEndConversation
    const endButton = await screen.findByRole('button', { name: /^end$/i });
    fireEvent.click(endButton);

    // 4. Assert that the quest remains in the completed list.
    await waitFor(() => {
      const completedQuests = JSON.parse(
        mockLocalStorage.getItem('school-of-the-ancients-completed-quests') || '[]'
      );
      expect(completedQuests).toContain(questToTest.id);
    });

    // Also check that the app returns to the selector view
    await waitFor(() => {
      expect(screen.getByText(/learning quests/i)).toBeInTheDocument();
    });
  });
});

