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
    expect(result.apiKeys).toEqual({});
    expect(updateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ apiKey: null, apiKeys: {} }),
      migrated_at: null,
    });
    expect(updateEqMock).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('preserves encrypted API keys with metadata', async () => {
    const encrypted = {
      cipherText: 'cipher',
      iv: 'iv-value',
      updatedAt: '2024-05-20T12:00:00Z',
      deviceId: 'device-a',
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
    expect(result.apiKeys).toEqual({});
    expect(result.migratedAt).toBe('2024-05-21T09:00:00Z');
    expect(updateMock).not.toHaveBeenCalled();
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
    expect(result.apiKeys).toEqual({});
    expect(updateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ apiKey: null, apiKeys: {} }),
      migrated_at: null,
    });
    expect(updateEqMock).toHaveBeenCalledWith('user_id', 'user-3');
  });

  it('sanitizes multi-device API key entries', async () => {
    setupSupabaseResponse({
      data: {
        data: {
          ...DEFAULT_USER_DATA,
          apiKeys: {
            'device-a': { cipherText: 'cipher-a', iv: 'iv-a', updatedAt: '2024-06-01T00:00:00Z' },
            'device-b': { cipherText: 'cipher-b', iv: 'iv-b', updatedAt: 'not-a-date', deviceId: 'device-b' },
          },
        },
        migrated_at: null,
      },
      error: null,
    });

    const result = await fetchUserData('user-4');

    expect(result.apiKeys).toEqual({
      'device-a': { cipherText: 'cipher-a', iv: 'iv-a', updatedAt: '2024-06-01T00:00:00Z', deviceId: null },
      'device-b': { cipherText: 'cipher-b', iv: 'iv-b', updatedAt: null, deviceId: 'device-b' },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('drops malformed multi-device entries and persists the cleanup', async () => {
    setupSupabaseResponse({
      data: {
        data: {
          ...DEFAULT_USER_DATA,
          apiKeys: {
            'device-a': null,
            'device-b': { cipherText: 123, iv: 'iv-b' },
          },
        },
        migrated_at: null,
      },
      error: null,
    });

    const result = await fetchUserData('user-5');

    expect(result.apiKeys).toEqual({});
    expect(updateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ apiKeys: {} }),
      migrated_at: null,
    });
    expect(updateEqMock).toHaveBeenCalledWith('user_id', 'user-5');
  });
});
