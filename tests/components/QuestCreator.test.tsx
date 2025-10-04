import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestCreator from '../../components/QuestCreator';
import { Character } from '../../types';

// Mock @google/genai
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
    BOOLEAN: 'BOOLEAN',
    STRING: 'STRING',
    ARRAY: 'ARRAY',
  },
}));

const mockOnQuestReady = vi.fn();
const mockOnCharacterCreated = vi.fn();
const mockOnBack = vi.fn();
const mockExistingCharacters: Character[] = [
    {
        id: 'socrates-1',
        name: 'Socrates',
        title: 'The Questioner',
        bio: 'I ask questions.',
        greeting: 'Hello.',
        timeframe: '5th century BC',
        expertise: 'Philosophy',
        passion: 'Questioning',
        systemInstruction: 'Act as Socrates.',
        suggestedPrompts: ['What is justice?'],
        voiceName: 'en-US-Standard-A',
        voiceAccent: 'en-US',
        ambienceTag: 'agora',
        portraitUrl: 'socrates.png',
    }
];

describe('QuestCreator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the form with a text area and select fields', () => {
        render(<QuestCreator characters={[]} onBack={mockOnBack} onQuestReady={mockOnQuestReady} onCharacterCreated={mockOnCharacterCreated} />);

        expect(screen.getByPlaceholderText(/e.g., "Understand backpropagation/)).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Difficulty' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Style' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Time' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create Quest' })).toBeInTheDocument();
    });

    it('should preload the initial goal when provided', () => {
        render(
            <QuestCreator
                characters={[]}
                onBack={mockOnBack}
                onQuestReady={mockOnQuestReady}
                onCharacterCreated={mockOnCharacterCreated}
                initialGoal="Strengthen my grasp of rhetorical devices"
            />
        );

        expect(screen.getByDisplayValue('Strengthen my grasp of rhetorical devices')).toBeInTheDocument();
    });

    it('should show an error if the goal is empty on creation', async () => {
        const user = userEvent.setup();
        render(<QuestCreator characters={[]} onBack={mockOnBack} onQuestReady={mockOnQuestReady} onCharacterCreated={mockOnCharacterCreated} />);

        await user.click(screen.getByRole('button', { name: 'Create Quest' }));

        expect(await screen.findByText('Tell me what you want to learn.')).toBeInTheDocument();
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should handle successful quest creation when mentor does not exist', async () => {
        const user = userEvent.setup();
        mockGenerateContent
            .mockResolvedValueOnce({ text: JSON.stringify({ meaningful: true }) })
            .mockResolvedValueOnce({ text: JSON.stringify({ title: 'The Republic', description: 'A quest about justice.', objective: 'Understand justice.', focusPoints: ['Allegory of the Cave'], duration: '30-45 min', mentorName: 'Plato' }) })
            .mockResolvedValueOnce({ text: JSON.stringify({ mentorName: 'Plato' }) })
            .mockResolvedValueOnce({ text: JSON.stringify({ title: 'The Idealist', bio: 'I write dialogues.', greeting: 'Welcome.', timeframe: '4th century BC', expertise: 'Metaphysics', passion: 'Forms', systemInstruction: 'Act as Plato.', suggestedPrompts: ['What is virtue?'], voiceName: 'en-US-Standard-B', voiceAccent: 'en-US', ambienceTag: 'academy' }) });
        mockGenerateImages.mockResolvedValueOnce({ generatedImages: [{ image: { imageBytes: 'fake-portrait-data' } }] });

        render(<QuestCreator characters={mockExistingCharacters} onBack={mockOnBack} onQuestReady={mockOnQuestReady} onCharacterCreated={mockOnCharacterCreated} />);

        await user.type(screen.getByPlaceholderText(/e.g., "Understand backpropagation/), 'Learn about justice');
        await user.click(screen.getByRole('button', { name: 'Create Quest' }));

        await waitFor(() => {
            expect(mockOnQuestReady).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'The Republic' }),
                expect.objectContaining({ name: 'Plato' })
            );
        });
        await waitFor(() => {
            expect(mockOnCharacterCreated).toHaveBeenCalledWith(expect.objectContaining({ name: 'Plato' }));
        });
    });

    it('should handle successful quest creation when mentor already exists', async () => {
        const user = userEvent.setup();
        mockGenerateContent
            .mockResolvedValueOnce({ text: JSON.stringify({ meaningful: true }) })
            .mockResolvedValueOnce({ text: JSON.stringify({ title: 'The Examined Life', description: 'A quest about self-knowledge.', objective: 'Know thyself.', focusPoints: ['Socratic method'], duration: '10-15 min', mentorName: 'Socrates' }) })
            .mockResolvedValueOnce({ text: JSON.stringify({ mentorName: 'Socrates' }) });

        render(<QuestCreator characters={mockExistingCharacters} onBack={mockOnBack} onQuestReady={mockOnQuestReady} onCharacterCreated={mockOnCharacterCreated} />);

        await user.type(screen.getByPlaceholderText(/e.g., "Understand backpropagation/), 'Learn to question everything');
        await user.click(screen.getByRole('button', { name: 'Create Quest' }));

        await waitFor(() => {
            expect(mockOnQuestReady).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'The Examined Life', characterId: 'socrates-1' }),
                mockExistingCharacters[0]
            );
        });
        expect(mockOnCharacterCreated).not.toHaveBeenCalled();
    });

    it('should handle a non-meaningful goal error from the API', async () => {
        const user = userEvent.setup();
        const errorMessage = 'This goal is not specific enough.';
        mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ meaningful: false, reason: errorMessage }) });

        render(<QuestCreator characters={[]} onBack={mockOnBack} onQuestReady={mockOnQuestReady} onCharacterCreated={mockOnCharacterCreated} />);

        await user.type(screen.getByPlaceholderText(/e.g., "Understand backpropagation/), 'asdfasdf');
        await user.click(screen.getByRole('button', { name: 'Create Quest' }));

        expect(await screen.findByText(errorMessage)).toBeInTheDocument();
        expect(mockOnQuestReady).not.toHaveBeenCalled();
    });

    it('should handle a general API error during quest creation', async () => {
        const user = userEvent.setup();
        mockGenerateContent.mockRejectedValue(new Error('Network Error'));

        render(<QuestCreator characters={[]} onBack={mockOnBack} onQuestReady={mockOnQuestReady} onCharacterCreated={mockOnCharacterCreated} />);

        await user.type(screen.getByPlaceholderText(/e.g., "Understand backpropagation/), 'Learn about APIs');
        await user.click(screen.getByRole('button', { name: 'Create Quest' }));

        expect(await screen.findByText('Network Error')).toBeInTheDocument();
        expect(mockOnQuestReady).not.toHaveBeenCalled();
    });
});