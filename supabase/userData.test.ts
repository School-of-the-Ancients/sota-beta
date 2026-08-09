import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchUserData, DEFAULT_USER_DATA } from './userData';

const {
  fromMock,
  selectMock,
  selectEqMock,
  maybeSingleMock,
  insertMock,
  updateMock,
  updateEqMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  selectEqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  updateEqMock: vi.fn(),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: fromMock,
  },
}));

const setupSupabaseResponse = (response: unknown) => {
  maybeSingleMock.mockResolvedValue(response);
  selectEqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
  selectMock.mockReturnValue({ eq: selectEqMock });
  insertMock.mockResolvedValue({ error: null });
  updateEqMock.mockResolvedValue({ error: null });
  updateMock.mockReturnValue({ eq: updateEqMock });
  fromMock.mockReturnValue({
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  });
};

describe('fetchUserData', () => {
  beforeEach(() => {
    fromMock.mockReset();
    selectMock.mockReset();
    selectEqMock.mockReset();
    maybeSingleMock.mockReset();
    insertMock.mockReset();
    updateMock.mockReset();
    updateEqMock.mockReset();
  });

  it('removes legacy persisted API key fields and saves the cleanup', async () => {
    setupSupabaseResponse({
      data: {
        data: {
          ...DEFAULT_USER_DATA,
          apiKey: { cipherText: 'cipher', iv: 'iv-value' },
          apiKeys: {
            'device-a': { cipherText: 'cipher-a', iv: 'iv-a' },
          },
        },
        migrated_at: null,
      },
      error: null,
    });

    const result = await fetchUserData('user-1');

    expect(result).not.toHaveProperty('apiKey');
    expect(result).not.toHaveProperty('apiKeys');
    expect(updateMock).toHaveBeenCalledOnce();
    const persistedData = updateMock.mock.calls[0][0].data;
    expect(persistedData).not.toHaveProperty('apiKey');
    expect(persistedData).not.toHaveProperty('apiKeys');
    expect(updateEqMock).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('preserves clean user data without an unnecessary write', async () => {
    setupSupabaseResponse({
      data: {
        data: DEFAULT_USER_DATA,
        migrated_at: '2024-05-21T09:00:00Z',
      },
      error: null,
    });

    const result = await fetchUserData('user-2');

    expect(result.migratedAt).toBe('2024-05-21T09:00:00Z');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('creates default data for a new account', async () => {
    setupSupabaseResponse({ data: null, error: null });

    const result = await fetchUserData('user-3');

    expect(result).toEqual(DEFAULT_USER_DATA);
    expect(insertMock).toHaveBeenCalledWith({ user_id: 'user-3', data: DEFAULT_USER_DATA });
  });
});
