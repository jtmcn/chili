import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { EventState } from '@/lib/types'

const state = vi.hoisted(() => ({ event: undefined as unknown, refreshes: [] as (() => void)[] }))
vi.mock('@/lib/event', async (orig) => ({
  ...(await orig<typeof import('@/lib/event')>()),
  fetchEvent: vi.fn(async () => state.event),
}))
vi.mock('@/lib/live', async () => {
  const { useCallback, useEffect, useRef, useState } = await import('react')
  return {
    useLive: <T,>(_t: string[], fetcher: () => Promise<T>) => {
      const [data, setData] = useState<T>()
      const f = useRef(fetcher)
      const refresh = useCallback(() => void f.current().then(setData), [])
      useEffect(() => {
        refresh()
        state.refreshes.push(refresh)
      }, [refresh])
      return { data, error: undefined, refresh }
    },
  }
})

import { offsetFrom, serverNow } from '@/lib/event'
import { phaseOf, useEventPhase } from '@/lib/phase'

const NOW = Date.parse('2026-10-25T18:00:00Z')
const base: EventState = {
  name: 'x',
  status: 'voting',
  revealAt: null,
  entriesOpen: true,
  serverNow: '2026-10-25T18:00:00Z',
}
const REVEAL = '2026-10-25T19:00:00Z'

describe('phaseOf', () => {
  it('is revealed once now >= revealAt even if status is voting', () => {
    const e = { ...base, revealAt: REVEAL }
    expect(phaseOf(e, Date.parse(REVEAL)).phase).toBe('revealed')
    expect(phaseOf(e, Date.parse(REVEAL) - 1000).phase).toBe('voting')
  })
  it('falls back to status when revealAt is null', () => {
    expect(phaseOf({ ...base, status: 'setup' }, NOW).phase).toBe('setup')
  })
  it('opens voting only while a Reveal time is set and ahead', () => {
    expect(phaseOf(base, NOW).votingOpen).toBe(false)
    expect(phaseOf({ ...base, revealAt: REVEAL }, NOW).votingOpen).toBe(true)
    expect(phaseOf({ ...base, revealAt: REVEAL }, Date.parse(REVEAL)).votingOpen).toBe(false)
    expect(phaseOf({ ...base, status: 'setup', revealAt: REVEAL }, NOW).votingOpen).toBe(false)
  })
  it('closes entries at the Reveal even if the Host left them open', () => {
    const e = { ...base, revealAt: REVEAL }
    expect(phaseOf(e, NOW).entriesOpen).toBe(true)
    expect(phaseOf(e, Date.parse(REVEAL)).entriesOpen).toBe(false)
    expect(phaseOf({ ...e, entriesOpen: false }, NOW).entriesOpen).toBe(false)
  })
})

describe('serverNow', () => {
  it('corrects for a phone clock 10 minutes fast', () => {
    const received = Date.parse('2026-10-25T18:10:00Z')
    const offset = offsetFrom(base, received)
    expect(serverNow(offset, received)).toBe(NOW)
  })
})

describe('useEventPhase', () => {
  const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0) })
  const ev = (revealAt: string | null) => ({ ...base, revealAt, serverNow: new Date(NOW).toISOString() })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    state.refreshes = []
  })
  afterEach(() => vi.useRealTimers())

  it('reports nothing open before the Event loads', () => {
    state.event = new Promise(() => {})
    const { result } = renderHook(() => useEventPhase())
    expect(result.current).toMatchObject({ event: undefined, phase: undefined, votingOpen: false, entriesOpen: false })
  })

  it('flips to revealed at revealAt without a refetch', async () => {
    state.event = ev(new Date(NOW + 3000).toISOString())
    const { result } = renderHook(() => useEventPhase())
    await flush()
    expect(result.current).toMatchObject({ phase: 'voting', votingOpen: true, entriesOpen: true })
    await act(async () => { await vi.advanceTimersByTimeAsync(2999) })
    expect(result.current.phase).toBe('voting')
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(result.current).toMatchObject({ phase: 'revealed', votingOpen: false, entriesOpen: false })
  })

  it('re-arms when a refresh moves revealAt later', async () => {
    state.event = ev(new Date(NOW + 3000).toISOString())
    const { result } = renderHook(() => useEventPhase())
    await flush()
    state.event = ev(new Date(NOW + 60_000).toISOString())
    await act(async () => { state.refreshes.forEach((r) => r()) })
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(result.current.phase).toBe('voting')
  })

  it('is revealed straight away when revealAt has passed', async () => {
    state.event = ev(new Date(NOW - 1000).toISOString())
    const { result } = renderHook(() => useEventPhase())
    await flush()
    expect(result.current.phase).toBe('revealed')
  })

  it('does not fire early for a Reveal beyond the setTimeout limit', async () => {
    state.event = ev(new Date(NOW + 30 * 86_400_000).toISOString())
    const { result } = renderHook(() => useEventPhase())
    await flush()
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(result.current.phase).toBe('voting')
  })
})
