import { browserClient } from '@/lib/supabase/browser'
import type { EventState, Phase } from '@/lib/types'

export async function fetchEvent(): Promise<EventState> {
  const { data, error } = await browserClient().rpc('get_event')
  if (error) throw error
  const row = data[0]
  if (!row) throw new Error('event row missing')
  return {
    name: row.name,
    status: row.status as EventState['status'],
    revealAt: row.reveal_at,
    entriesOpen: row.entries_open,
    serverNow: row.server_now,
  }
}

// Offset = server clock minus local clock at the moment the response arrived.
export function offsetFrom(e: EventState, receivedAt = Date.now()): number {
  return Date.parse(e.serverNow) - receivedAt
}

export function serverNow(offsetMs: number, now = Date.now()): number {
  return now + offsetMs
}

export function currentPhase(e: EventState, nowMs: number): Phase {
  return e.revealAt && nowMs >= Date.parse(e.revealAt) ? 'revealed' : e.status
}
