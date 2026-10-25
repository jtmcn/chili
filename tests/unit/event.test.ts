import { describe, expect, it } from 'vitest'
import { currentPhase, offsetFrom, serverNow } from '@/lib/event'
import type { EventState } from '@/lib/types'

const base: EventState = {
  name: 'x',
  status: 'voting',
  revealAt: null,
  entriesOpen: true,
  serverNow: '2026-10-25T18:00:00Z',
}

describe('currentPhase', () => {
  it('is revealed once now >= revealAt even if status is voting', () => {
    const e = { ...base, revealAt: '2026-10-25T19:00:00Z' }
    expect(currentPhase(e, Date.parse('2026-10-25T19:00:00Z'))).toBe('revealed')
    expect(currentPhase(e, Date.parse('2026-10-25T18:59:59Z'))).toBe('voting')
  })
  it('falls back to status when revealAt is null', () => {
    expect(currentPhase({ ...base, status: 'setup' }, Date.now())).toBe('setup')
  })
})

describe('serverNow', () => {
  it('corrects for a phone clock 10 minutes fast', () => {
    const received = Date.parse('2026-10-25T18:10:00Z')
    const offset = offsetFrom(base, received)
    expect(serverNow(offset, received)).toBe(Date.parse('2026-10-25T18:00:00Z'))
  })
})
