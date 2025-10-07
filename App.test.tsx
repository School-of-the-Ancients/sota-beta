import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { UserDataProvider } from './hooks/useUserData';
import * as userData from './supabase/userData';
import { DEFAULT_USER_DATA } from './supabase/userData';

// Mock the useSupabaseAuth hook
vi.mock('./hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: { id: 'test-user' },
    loading: false,
    signOut: vi.fn(),
  }),
}));

// Mock the supabase/userData module
vi.mock('./supabase/userData', async () => {
  const actual = await vi.importActual('./supabase/userData');
  return {
    ...actual,
    fetchUserData: vi.fn(),
  };
});

describe('App', () => {
  beforeEach(() => {
    vi.mocked(userData.fetchUserData).mockResolvedValue({
      ...DEFAULT_USER_DATA,
      customCharacters: [],
      customQuests: [],
      conversations: [],
      completedQuestIds: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main application container', async () => {
    render(
      <MemoryRouter>
        <UserDataProvider>
          <App />
        </UserDataProvider>
      </MemoryRouter>
    );

    // Wait for the app to finish loading data
    await waitFor(() => {
      expect(screen.getByText('Welcome to the School of the Ancients')).toBeInTheDocument();
    });
  });

  it('renders the History view when navigating to /history', async () => {
    render(
      <MemoryRouter initialEntries={['/history']}>
        <UserDataProvider>
          <App />
        </UserDataProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Conversation History')).toBeInTheDocument();
    });
  });

  it('renders the Quests view when navigating to /quests', async () => {
    render(
      <MemoryRouter initialEntries={['/quests']}>
        <UserDataProvider>
          <App />
        </UserDataProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Learning Quests')).toBeInTheDocument();
    });
  });
});