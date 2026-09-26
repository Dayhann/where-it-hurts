import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('getApiClient', () => {
  it('returns the mock API when NEXT_PUBLIC_USE_MOCKS is true', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', 'true');
    vi.resetModules();
    const { getApiClient } = await import('./index');
    const { mockApi } = await import('@/mocks/mock-api');
    expect(getApiClient()).toBe(mockApi);
  });

  it('returns a live HTTP client otherwise', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCKS', 'false');
    vi.resetModules();
    const { getApiClient } = await import('./index');
    const { mockApi } = await import('@/mocks/mock-api');
    expect(getApiClient()).not.toBe(mockApi);
    expect(typeof getApiClient().putMarks).toBe('function');
  });
});
