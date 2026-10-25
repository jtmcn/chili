import { describe, expect, it, vi } from 'vitest'

const handlers: Array<(m: { payload: unknown }) => void> = []
const channel = vi.fn(() => {
  const ch = {
    on: (_t: string, _f: unknown, h: (m: { payload: unknown }) => void) => {
      handlers.push(h)
      return ch
    },
    subscribe: () => ch,
  }
  return ch
})
const removeChannel = vi.fn()
vi.mock('@/lib/supabase/browser', () => ({ browserClient: () => ({ channel, removeChannel }) }))

import { subscribeLive } from '@/lib/live-channel'

describe('subscribeLive', () => {
  it('keeps the channel across unsubscribe/resubscribe', () => {
    const a = vi.fn()
    subscribeLive(a)()
    const b = vi.fn()
    subscribeLive(b)
    handlers[0]({ payload: { table: 'chilis' } })
    expect(b).toHaveBeenCalledWith('chilis')
    expect(a).not.toHaveBeenCalled()
    expect(channel).toHaveBeenCalledTimes(1)
    expect(removeChannel).not.toHaveBeenCalled()
  })
})
