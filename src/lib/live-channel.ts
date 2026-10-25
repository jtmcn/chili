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
  return () => {
    listeners.delete(onChange)
    if (listeners.size === 0 && channel) {
      void browserClient().removeChannel(channel)
      channel = undefined
    }
  }
}
