import type { SupabaseClient } from '@supabase/supabase-js';
import { GetClinicQueueResponseSchema } from '@/contracts/api';
import { SessionSchema } from '@/contracts/schemas';
import type { Session } from '@/contracts/types';
import { orderQueue, toQueueItem } from './types';
import type { ClinicQueueItem, SessionStore } from './types';

function rowFor(session: Session) {
  return {
    id: session.id,
    status: session.status,
    starts_at: session.appointment.startsAt,
    red_flag: session.redFlags.length > 0,
    data: session,
  };
}

/** The service-role client must only be constructed in server code. */
export class SupabaseStore implements SessionStore {
  constructor(private readonly client: SupabaseClient) {}

  async create(session: Session): Promise<Session> {
    const parsed = SessionSchema.parse(session);
    const { data, error } = await this.client
      .from('sessions')
      .insert(rowFor(parsed))
      .select('data')
      .single();
    if (error) throw new Error(`Could not create session: ${error.message}`);
    return SessionSchema.parse(data.data);
  }

  async get(id: string): Promise<Session | null> {
    const { data, error } = await this.client
      .from('sessions')
      .select('data')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Could not read session: ${error.message}`);
    return data ? SessionSchema.parse(data.data) : null;
  }

  async update(session: Session): Promise<Session> {
    const parsed = SessionSchema.parse(session);
    const { data, error } = await this.client
      .from('sessions')
      .update(rowFor(parsed))
      .eq('id', parsed.id)
      .select('data')
      .maybeSingle();
    if (error) throw new Error(`Could not update session: ${error.message}`);
    if (!data) throw new Error(`Session ${parsed.id} was not found`);
    return SessionSchema.parse(data.data);
  }

  async listQueue(): Promise<ClinicQueueItem[]> {
    const { data, error } = await this.client
      .from('sessions')
      .select('data')
      .order('red_flag', { ascending: false })
      .order('starts_at', { ascending: true });
    if (error) throw new Error(`Could not list queue: ${error.message}`);
    return GetClinicQueueResponseSchema.parse({
      items: orderQueue(
        (data ?? []).map((row) => toQueueItem(SessionSchema.parse(row.data))),
      ),
    }).items;
  }
}
