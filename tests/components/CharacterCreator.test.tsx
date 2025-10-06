import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CharacterCreator from '../../components/CharacterCreator';

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

// Mock constants
vi.mock('../../suggestions', () => ({
    HISTORICAL_FIGURES_SUGGESTIONS: ['Socrates', 'Plato', 'Aristotle'],
}));

const mockOnCharacterCreated = vi.fn();
const mockOnBack = vi.fn();

const renderCreator = (overrideProps = {}) =>
  render(
    <CharacterCreator
      apiKey="test-api-key"
      onCharacterCreated={mockOnCharacterCreated}
      onBack={mockOnBack}
      {...overrideProps}
    />
  );

describe('CharacterCreator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the form and allow typing a name', () => {
        renderCreator();

        const input = screen.getByPlaceholderText('Begin typing a historical figure…');
        fireEvent.change(input, { target: { value: 'Socrates' } });

        expect(input).toHaveValue('Socrates');
    });

    it('should show suggestions on input focus and filter them', async () => {
        renderCreator();
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText('Begin typing a historical figure…');
        await user.click(input);

        expect(await screen.findByText('Socrates')).toBeInTheDocument();
        expect(await screen.findByText('Plato')).toBeInTheDocument();
        expect(await screen.findByText('Aristotle')).toBeInTheDocument();

        await user.type(input, 'Pla');

        expect(screen.queryByText('Socrates')).not.toBeInTheDocument();
        expect(screen.getByText('Plato')).toBeInTheDocument();
    });

    it('should fill input when a suggestion is clicked', async () => {
        renderCreator();
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText('Begin typing a historical figure…');
        await user.click(input);

        const suggestionButton = await screen.findByText('Plato');
        await user.click(suggestionButton);

        expect(input).toHaveValue('Plato');
    });

    it('should call onBack when the back button is clicked', () => {
        renderCreator();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(mockOnBack).toHaveBeenCalled();
    });

    it('should show an error if the name is empty on creation', async () => {
        renderCreator();
        fireEvent.click(screen.getByRole('button', { name: 'Create Ancient' }));

        expect(await screen.findByText('Enter a historical figure’s name.')).toBeInTheDocument();
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should handle successful character creation', async () => {
        const user = userEvent.setup();
        // Mock the API calls to resolve asynchronously
        mockGenerateContent
            .mockImplementationOnce(() => new Promise(res => setTimeout(() => res({ text: JSON.stringify({ verified: true, summary: 'A Greek philosopher', era: '5th century BC' }) }), 10)))
            .mockImplementationOnce(() => new Promise(res => setTimeout(() => res({ text: JSON.stringify({
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
            }) }), 10)));

        mockGenerateImages.mockImplementationOnce(() => new Promise(res => setTimeout(() => res({ generatedImages: [{ image: { imageBytes: 'fake-portrait-data' } }] }), 10)));

        renderCreator();

        const input = screen.getByPlaceholderText('Begin typing a historical figure…');
        await user.type(input, 'Socrates');

        const createButton = screen.getByRole('button', { name: 'Create Ancient' });
        // Do not await the click, allowing the test to observe the loading state immediately.
        user.click(createButton);

        // Check for loading states in order
        expect(await screen.findByText('Verifying historical figure…')).toBeInTheDocument();
        expect(await screen.findByText('Researching historical figure…')).toBeInTheDocument();
        expect(await screen.findByText('Painting portrait…')).toBeInTheDocument();

        // Check for the final result
        await waitFor(() => {
            expect(mockOnCharacterCreated).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Socrates',
                title: 'The Questioner',
            }));
        });
    });

    it('should handle failed historical verification', async () => {
        mockGenerateContent.mockResolvedValueOnce({
            text: JSON.stringify({ verified: false, summary: 'Could not verify', era: '' }),
        });

        renderCreator();
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText('Begin typing a historical figure…');
        await user.type(input, 'Mickey Mouse');

        const createButton = screen.getByRole('button', { name: 'Create Ancient' });
        await user.click(createButton);

        await waitFor(() => {
            expect(screen.getByText('We could not verify this figure in the historical record. Try another name.')).toBeInTheDocument();
        });
        expect(mockOnCharacterCreated).not.toHaveBeenCalled();
    });

    it('should handle API errors during creation', async () => {
        mockGenerateContent.mockRejectedValue(new Error('API is down'));

        renderCreator();
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText('Begin typing a historical figure…');
        await user.type(input, 'Socrates');

        const createButton = screen.getByRole('button', { name: 'Create Ancient' });
        await user.click(createButton);

        await waitFor(() => {
            expect(screen.getByText('API is down')).toBeInTheDocument();
        });
        expect(mockOnCharacterCreated).not.toHaveBeenCalled();
    });
});