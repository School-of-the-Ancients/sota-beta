import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchUserData, DEFAULT_USER_DATA } from './userData';

const { fromMock, selectMock, eqMock, maybeSingleMock, insertMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: fromMock,
  },
}));

const setupSupabaseResponse = (response: unknown) => {
  maybeSingleMock.mockResolvedValue(response);
  eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
  selectMock.mockReturnValue({ eq: eqMock });
  insertMock.mockResolvedValue({ error: null });
  fromMock.mockReturnValue({
    select: selectMock,
    insert: insertMock,
  });
};

describe('fetchUserData', () => {
  beforeEach(() => {
    fromMock.mockReset();
    selectMock.mockReset();
    eqMock.mockReset();
    maybeSingleMock.mockReset();
    insertMock.mockReset();
  });

  it('coerces legacy string API keys to null', async () => {
    setupSupabaseResponse({
      data: {
        data: {
          ...DEFAULT_USER_DATA,
          apiKey: 'plain-text-key',
        },
        migrated_at: null,
      },
      error: null,
    });

    const result = await fetchUserData('user-1');

    expect(result.apiKey).toBeNull();
  });

  it('preserves encrypted API keys with metadata', async () => {
    const encrypted = {
      cipherText: 'cipher',
      iv: 'iv-value',
      updatedAt: '2024-05-20T12:00:00Z',
    } as const;

    setupSupabaseResponse({
      data: {
        data: {
          ...DEFAULT_USER_DATA,
          apiKey: encrypted,
        },
        migrated_at: '2024-05-21T09:00:00Z',
      },
      error: null,
    });

    const result = await fetchUserData('user-2');

    expect(result.apiKey).toEqual(encrypted);
    expect(result.migratedAt).toBe('2024-05-21T09:00:00Z');
  });

  it('drops malformed encrypted payloads', async () => {
    setupSupabaseResponse({
      data: {
        data: {
          ...DEFAULT_USER_DATA,
          apiKey: { cipherText: 123, iv: null },
        },
        migrated_at: null,
      },
      error: null,
    });

    const result = await fetchUserData('user-3');

    expect(result.apiKey).toBeNull();
  });
});
