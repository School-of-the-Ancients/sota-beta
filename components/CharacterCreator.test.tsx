import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CharacterCreator from './CharacterCreator';

// Mock suggestions for a controlled test environment
vi.mock('../suggestions', () => ({
  HISTORICAL_FIGURES_SUGGESTIONS: [
    'Socrates',
    'Plato',
    'Aristotle',
    'Alexander the Great',
  ],
}));

const mockOnCharacterCreated = vi.fn();
const mockOnBack = vi.fn();

// Mock the GoogleGenAI module since we are not testing the API calls here
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn(),
      generateImages: vi.fn(),
    },
  })),
  Type: {
    OBJECT: 'OBJECT',
    BOOLEAN: 'BOOLEAN',
    STRING: 'STRING',
    ARRAY: 'ARRAY',
  },
}));

describe('CharacterCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_KEY = 'test-api-key';
  });

  it('renders correctly and shows initial suggestions on focus', async () => {
    render(<CharacterCreator onCharacterCreated={mockOnCharacterCreated} onBack={mockOnBack} />);

    expect(screen.getByText('Create an Ancient')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Begin typing a historical figure…');

    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Socrates')).toBeInTheDocument();
      expect(screen.getByText('Plato')).toBeInTheDocument();
    });
  });

  it('filters suggestions based on user input', async () => {
    const user = userEvent.setup();
    render(<CharacterCreator onCharacterCreated={mockOnCharacterCreated} onBack={mockOnBack} />);

    const input = screen.getByPlaceholderText('Begin typing a historical figure…');
    await user.type(input, 'Alex');

    await waitFor(() => {
      expect(screen.getByText('Alexander the Great')).toBeInTheDocument();
      expect(screen.queryByText('Socrates')).not.toBeInTheDocument();
    });
  });

  it('fills the input when a suggestion is clicked', async () => {
    const user = userEvent.setup();
    render(<CharacterCreator onCharacterCreated={mockOnCharacterCreated} onBack={mockOnBack} />);

    const input = screen.getByPlaceholderText('Begin typing a historical figure…');
    fireEvent.focus(input);

    const suggestionButton = await screen.findByText('Plato');
    await user.click(suggestionButton);

    expect(input).toHaveValue('Plato');
  });

  it('selects a random character when the randomize button is clicked', async () => {
    const user = userEvent.setup();
    render(<CharacterCreator onCharacterCreated={mockOnCharacterCreated} onBack={mockOnBack} />);

    const randomizeButton = screen.getByLabelText('Roll the dice for a random historical figure');
    await user.click(randomizeButton);

    const input = screen.getByPlaceholderText('Begin typing a historical figure…');
    // The value could be any of the mocked suggestions.
    // We just check that the input is no longer empty.
    expect(input.value).not.toBe('');
  });
});