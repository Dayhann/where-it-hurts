import type { ApiClient } from '@/contracts/api';
import { mockApi } from '@/mocks/mock-api';
import { createHttpApi } from './http';

let http: ApiClient | undefined;

export function getApiClient(): ApiClient {
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    return mockApi;
  }
  http ??= createHttpApi();
  return http;
}
