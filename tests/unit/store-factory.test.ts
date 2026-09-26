import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('store selection', () => {
  it('defaults to one process-local MemoryStore', async () => {
    vi.stubEnv('STORE', 'memory');
    vi.resetModules();
    const { getSessionStore } = await import('@/server/store');
    const first = getSessionStore();
    expect(first.constructor.name).toBe('MemoryStore');
    expect(getSessionStore()).toBe(first);
  });

  it('requires both Supabase settings before constructing a client', async () => {
    vi.stubEnv('STORE', 'supabase');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_KEY', '');
    vi.resetModules();
    const { getSessionStore } = await import('@/server/store');
    expect(() => getSessionStore()).toThrow(
      'STORE=supabase requires SUPABASE_URL and SUPABASE_SERVICE_KEY',
    );
  });

  it('rejects an unknown store mode', async () => {
    vi.stubEnv('STORE', 'unknown');
    vi.resetModules();
    const { getSessionStore } = await import('@/server/store');
    expect(() => getSessionStore()).toThrow('Unknown STORE mode: unknown');
  });
});
