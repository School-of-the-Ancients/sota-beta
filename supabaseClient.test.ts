import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.fn(() => ({ auth: {} }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
const jwt = (role: string) => `e30.${btoa(JSON.stringify({ role }))}.signature`;

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  createClient.mockClear();
});

describe('production backend bootstrap', () => {
  it('loads the reviewed runtime endpoint instead of stale Vercel env values', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('BASE_URL', '/');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://retired.example.com');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'old-key');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ configUrl: 'https://example.com/sota-api/client-config', allowSignup: false, googleEnabled: false }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://example.com/sota-api', anonKey: jwt('anon') }) });
    vi.stubGlobal('fetch', fetchMock);
    const module = await import('./supabaseClient');
    await module.initializeSupabase();
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/sota-runtime.json', expect.any(Object));
    expect(createClient).toHaveBeenCalledWith('https://example.com/sota-api', jwt('anon'), expect.any(Object));
    expect(module.authCapabilities).toEqual({ allowSignup: false, googleEnabled: false });
  });

  it('supports path-based deployments', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('BASE_URL', '/sota/');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ configUrl: 'https://example.com/sota-api/client-config' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://example.com/sota-api', anonKey: jwt('anon') }) });
    vi.stubGlobal('fetch', fetchMock);
    const module = await import('./supabaseClient');
    await module.initializeSupabase();
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/sota/sota-runtime.json', expect.any(Object));
  });

  it('fails closed if configuration is unavailable', async () => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const module = await import('./supabaseClient');
    await expect(module.initializeSupabase()).rejects.toThrow();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects service-role keys in browser configuration', async () => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ configUrl: 'https://example.com/sota-api/client-config' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://example.com/sota-api', anonKey: jwt('service_role') }) }));
    const module = await import('./supabaseClient');
    await expect(module.initializeSupabase()).rejects.toThrow();
    expect(createClient).not.toHaveBeenCalled();
  });
});
