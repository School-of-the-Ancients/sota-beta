import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { ConnectionState, Character } from './types';

// Mock dependencies
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  Type: {},
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
});