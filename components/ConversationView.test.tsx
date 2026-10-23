import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConversationView from './ConversationView';
import { ApiKeyProvider } from '../hooks/useApiKey';
import { ConnectionState, type Character } from '../types';

const mockSendTextMessage = vi.fn();
const mockToggleMicrophone = vi.fn();

vi.mock('../hooks/useTextDialogue', () => ({
  useTextDialogue: () => ({
    connectionState: ConnectionState.CONNECTED,
    userTranscription: '',
    modelTranscription: '',
    isMicActive: false,
    toggleMicrophone: mockToggleMicrophone,
    sendTextMessage: mockSendTextMessage,
  }),
}));

vi.mock('../hooks/useAmbientAudio', () => ({
  useAmbientAudio: () => ({
    isMuted: true,
    toggleMute: vi.fn(),
    changeTrack: vi.fn(),
  }),
}));

const character: Character = {
  id: 'socrates',
  name: 'Socrates',
  title: 'Philosopher',
  portraitUrl: '/socrates.png',
  bio: 'Athenian philosopher',
  greeting: 'What shall we examine?',
  systemInstruction: 'You are Socrates.',
  voiceName: 'Orus',
  voiceAccent: 'Athenian Greek-accented English',
  timeframe: 'Classical Athens',
  expertise: 'Ethics',
  passion: 'Inquiry',
  suggestedPrompts: ['What is virtue?'],
  ambienceTag: 'forum',
};

const renderConversation = () => render(
  <ApiKeyProvider apiKey="test-api-key">
    <ConversationView
      character={character}
      onEndConversation={vi.fn()}
      environmentImageUrl={null}
      onEnvironmentUpdate={vi.fn()}
      activeQuest={null}
      isSaving={false}
      conversationHistory={[]}
      onConversationUpdate={vi.fn()}
    />
  </ApiKeyProvider>
);

describe('ConversationView text-first mode', () => {
  it('lets the learner send text even when the microphone is muted', async () => {
    const user = userEvent.setup();
    renderConversation();

    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'What is virtue?');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(mockSendTextMessage).toHaveBeenCalledWith('What is virtue?');
  });

  it('labels the conversation as text-first with optional voice controls', () => {
    renderConversation();

    expect(screen.getByText(/Text-first Socratic dialogue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enable voice input/i)).toBeInTheDocument();
  });
});
