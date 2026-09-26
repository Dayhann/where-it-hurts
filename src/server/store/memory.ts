import { GetClinicQueueResponseSchema } from '@/contracts/api';
import { SessionSchema } from '@/contracts/schemas';
import type { Session } from '@/contracts/types';
import { orderQueue, toQueueItem } from './types';
import type { ClinicQueueItem, SessionStore } from './types';

/** Process-local store for development and deterministic tests. */
export class MemoryStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  async create(session: Session): Promise<Session> {
    const parsed = SessionSchema.parse(session);
    if (this.sessions.has(parsed.id)) {
      throw new Error(`Session ${parsed.id} already exists`);
    }
    this.sessions.set(parsed.id, parsed);
    return SessionSchema.parse(parsed);
  }

  async get(id: string): Promise<Session | null> {
    const session = this.sessions.get(id);
    return session ? SessionSchema.parse(session) : null;
  }

  async update(session: Session): Promise<Session> {
    const parsed = SessionSchema.parse(session);
    if (!this.sessions.has(parsed.id)) {
      throw new Error(`Session ${parsed.id} was not found`);
    }
    this.sessions.set(parsed.id, parsed);
    return SessionSchema.parse(parsed);
  }

  async listQueue(): Promise<ClinicQueueItem[]> {
    return GetClinicQueueResponseSchema.parse({
      items: orderQueue([...this.sessions.values()].map(toQueueItem)),
    }).items;
  }
}
