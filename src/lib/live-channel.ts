import type { RealtimeChannel } from '@supabase/supabase-js'
import { browserClient } from '@/lib/supabase/browser'

export type LiveTopic = 'event' | 'chilis' | 'chili_tags' | 'ballots'

const listeners = new Set<(t: LiveTopic) => void>()
let channel: RealtimeChannel | undefined

export function subscribeLive(onChange: (t: LiveTopic) => void): () => void {
  listeners.add(onChange)
  if (!channel) {
    channel = browserClient()
      .channel('live')
      .on('broadcast', { event: 'changed' }, ({ payload }) => {
        const t = (payload as { table: LiveTopic }).table
        listeners.forEach((l) => l(t))
      })
      .subscribe()
  }
  // Never tear the channel down: realtime-js reuses a leaving channel by topic,
  // so a resubscribe after navigation would no-op and pings would stop.
  return () => {
    listeners.delete(onChange)
  }
}
