import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConversationView from '../../components/ConversationView';
import { ConnectionState, Character } from '../../types';
import { ApiKeyProvider } from '../../hooks/useApiKey';

// Mocks
vi.mock('../../constants', () => ({
    AMBIENCE_LIBRARY: [
        { tag: 'agora', audioSrc: 'agora.mp3' },
        { tag: 'forest', audioSrc: 'forest.mp3' },
    ],
    AVAILABLE_VOICES: [
        { name: 'socrates-voice', gender: 'male', description: 'a thoughtful male timbre' },
    ],
}));

const mockGenerateContent = vi.fn();
const mockGenerateImages = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
      generateImages: mockGenerateImages,
    },
  })),
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY' },
}));

let onTurnCompleteCallback: (turn: { user: string; model: string }) => void;
let onEnvironmentChangeRequestCallback: (description: string) => void;
let onArtifactDisplayRequestCallback: (name: string, description: string) => void;

const mockToggleMicrophone = vi.fn();
const mockSendTextMessage = vi.fn();
const useGeminiLiveMock = vi.fn();

vi.mock('../../hooks/useGeminiLive', () => ({
  useGeminiLive: vi.fn((
    sysInstruction, voice, accent,
    onTurnComplete, onEnvironmentChange, onArtifactDisplay
  ) => {
    onTurnCompleteCallback = onTurnComplete;
    onEnvironmentChangeRequestCallback = onEnvironmentChange;
    onArtifactDisplayRequestCallback = onArtifactDisplay;
    return useGeminiLiveMock();
  }),
}));

const mockToggleAmbienceMute = vi.fn();
const mockChangeAmbienceTrack = vi.fn();
vi.mock('../../hooks/useAmbientAudio', () => ({
  useAmbientAudio: () => ({
    isMuted: false,
    toggleMute: mockToggleAmbienceMute,
    changeTrack: mockChangeAmbienceTrack,
  }),
}));

const mockCharacter: Character = {
    id: 'char-1', name: 'Socrates', title: 'The Gadfly of Athens',
    greeting: 'What is it you seek to understand?', systemInstruction: 'You are Socrates.',
    voiceName: 'socrates-voice', portraitUrl: 'socrates.png',
    suggestedPrompts: ['What is justice?', 'What is courage?'], ambienceTag: 'agora',
};

const mockOnEndConversation = vi.fn();
const mockOnEnvironmentUpdate = vi.fn();

const renderComponent = (props = {}) =>
    render(
        <ApiKeyProvider>
            <ConversationView
                character={mockCharacter}
                onEndConversation={mockOnEndConversation}
                onEnvironmentUpdate={mockOnEnvironmentUpdate}
                activeQuest={null}
                isSaving={false}
                {...props}
            />
        </ApiKeyProvider>
    );

describe('ConversationView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem('school-of-the-ancients-api-key', 'test-key');
        vi.spyOn(global, 'setInterval').mockImplementation(vi.fn() as any);
        vi.spyOn(global, 'clearInterval').mockImplementation(vi.fn());

        useGeminiLiveMock.mockReturnValue({
            connectionState: ConnectionState.CONNECTED, userTranscription: '', modelTranscription: '',
            isMicActive: true, toggleMicrophone: mockToggleMicrophone, sendTextMessage: mockSendTextMessage,
        });

        // Default mock for any suggestion calls
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ suggestions: [] }) });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render character details and initial greeting', () => {
        renderComponent();
        expect(screen.getByRole('heading', { name: 'Socrates' })).toBeInTheDocument();
        expect(screen.getByText('The Gadfly of Athens')).toBeInTheDocument();
        expect(screen.getByText('What is it you seek to understand?')).toBeInTheDocument();
    });

    it('should allow sending a text message', async () => {
        const user = userEvent.setup();
        renderComponent();

        const input = screen.getByPlaceholderText(/type a message/i);
        await user.type(input, 'Hello, Socrates!');
        await user.click(screen.getByRole('button', { name: 'Send message' }));

        expect(mockSendTextMessage).toHaveBeenCalledWith('Hello, Socrates!');
        expect(input).toHaveValue('');
    });

    it('should update transcript when a turn is completed', async () => {
        renderComponent();

        act(() => {
            onTurnCompleteCallback({ user: 'Hello user', model: 'Hello model' });
        });

        expect(await screen.findByText('Hello user')).toBeInTheDocument();
        expect(await screen.findByText('Hello model')).toBeInTheDocument();
    });

    it('should handle environment change requests', async () => {
        mockGenerateImages.mockResolvedValue({ generatedImages: [{ image: { imageBytes: 'fake-env-bytes' } }] });
        // This is a more specific mock for this test, overriding the default.
        mockGenerateContent.mockImplementation(async (config) => {
            // Check if it's the call for the audio tag (doesn't request JSON)
            if (!config.config?.responseSchema) {
                return { text: 'forest' };
            }
            // Otherwise, it's a suggestion call
            return { text: JSON.stringify({ suggestions: [] }) };
        });

        renderComponent();

        act(() => {
            onEnvironmentChangeRequestCallback('A dark forest');
        });

        await waitFor(() => {
            expect(screen.getByText('Environment Set: A dark forest')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(mockOnEnvironmentUpdate).toHaveBeenCalledWith(expect.stringContaining('data:image/jpeg;base64,'));
        });

        await waitFor(() => {
            expect(mockChangeAmbienceTrack).toHaveBeenCalledWith('forest.mp3');
        });
    });

    it('should handle artifact display requests', async () => {
        mockGenerateImages.mockResolvedValue({ generatedImages: [{ image: { imageBytes: 'fake-artifact-bytes' } }] });

        renderComponent();

        act(() => {
            onArtifactDisplayRequestCallback('The Hemlock', 'A cup of poison');
        });

        await waitFor(async () => {
            const artifactImage = await screen.findByRole('img', { name: 'The Hemlock' });
            expect(artifactImage).toBeInTheDocument();
            expect(artifactImage).toHaveAttribute('src', expect.stringContaining('data:image/jpeg;base64,'));
        });
    });

    it('should fetch and display dynamic suggestions when requested', async () => {
        const user = userEvent.setup();
        // Specific mock for this test's needs
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ suggestions: ['Dynamic Suggestion 1', 'Dynamic Suggestion 2'] }) });

        renderComponent();

        act(() => {
            onTurnCompleteCallback({ user: 'Tell me something.', model: 'Something has been told.' });
        });

        const suggestButton = await screen.findByRole('button', { name: /suggest prompts/i });
        expect(mockGenerateContent).not.toHaveBeenCalled();

        await user.click(suggestButton);

        expect(await screen.findByText('Dynamic Suggestion 1')).toBeInTheDocument();
        expect(await screen.findByText('Dynamic Suggestion 2')).toBeInTheDocument();
    });
});