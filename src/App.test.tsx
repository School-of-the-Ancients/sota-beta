import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from './App';
import { ConnectionState, Character } from './types';
import { QUESTS } from './constants';

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

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
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

const renderWithRouter = (initialEntries: string[] = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );

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

    window.AudioContext = vi.fn().mockImplementation(() => ({
      createGain: vi.fn(() => ({ gain: { setValueAtTime: vi.fn() }, connect: vi.fn() })),
      createBufferSource: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
      decodeAudioData: vi.fn(),
      resume: vi.fn(),
      suspend: vi.fn(),
    })) as unknown as typeof AudioContext;

    window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('should load a custom character from a URL parameter', async () => {
    const customCharacter: Character = {
      id: 'custom-char-1',
      name: 'Custom Character',
      title: 'A Test Persona',
      greeting: 'Hello from the test suite.',
      bio: 'A synthetic persona for testing.',
      timeframe: '21st century',
      expertise: 'Testing',
      passion: 'Quality assurance',
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
    renderWithRouter([`/conversation?character=${customCharacter.id}`]);

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

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithRouter();

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

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`0 of ${defaultQuestCount} quests completed`, 'i'))
      ).toBeInTheDocument();
    });

    expect(mockLocalStorage.getItem('school-of-the-ancients-custom-quests')).toBe(JSON.stringify([]));
    expect(mockLocalStorage.getItem('school-of-the-ancients-completed-quests')).toBe(JSON.stringify([]));
  });
});

