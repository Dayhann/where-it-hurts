import { createClient } from '@supabase/supabase-js';
import { MemoryStore } from './memory';
import { SupabaseStore } from './supabase';
import type { SessionStore } from './types';

let instance: SessionStore | undefined;

export function getSessionStore(): SessionStore {
  if (typeof window !== 'undefined') {
    throw new Error('SessionStore is only available on the server');
  }
  if (instance) return instance;

  const mode = process.env.STORE ?? 'memory';
  if (mode === 'memory') {
    instance = new MemoryStore();
  } else if (mode === 'supabase') {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error(
        'STORE=supabase requires SUPABASE_URL and SUPABASE_SERVICE_KEY',
      );
    }
    instance = new SupabaseStore(
      createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  } else {
    throw new Error(`Unknown STORE mode: ${mode}`);
  }
  return instance;
}

export type { SessionStore, ClinicQueueItem } from './types';
export { MemoryStore } from './memory';
export { SupabaseStore } from './supabase';
