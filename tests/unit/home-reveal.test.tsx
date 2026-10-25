import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'

const NOW = Date.parse('2030-01-01T18:00:00Z')
const chili = { id: 'a', potNumber: 1, name: 'Brisket Fire', description: null, cook: null, allergenIds: [] }
const state = vi.hoisted(() => ({ event: undefined as unknown, results: [] as unknown[], refreshes: [] as (() => void)[] }))

vi.mock('@/lib/chilis', () => ({ fetchChilis: vi.fn(async () => [chili]) }))
vi.mock('@/lib/reference', () => ({ fetchAllergens: vi.fn(async () => []), fetchTags: vi.fn(async () => []) }))
vi.mock('@/lib/tags', async (orig) => ({ ...(await orig<typeof import('@/lib/tags')>()), fetchTagCounts: vi.fn(async () => []) }))
vi.mock('@/lib/results', () => ({ fetchResults: vi.fn(async () => state.results) }))
vi.mock('@/lib/event', async (orig) => ({
  ...(await orig<typeof import('@/lib/event')>()),
  fetchEvent: vi.fn(async () => state.event),
  fetchBallotCount: vi.fn(async () => 0),
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

import { fetchResults } from '@/lib/results'
import { Home } from '@/components/Home'

const ev = (revealAt: string) => ({ name: 'E', status: 'voting', revealAt, entriesOpen: false, serverNow: new Date(NOW).toISOString() })
const row = { chiliId: 'a', potNumber: 1, name: 'Brisket Fire', cook: 'Sam', points: 9, firsts: 3, seconds: 0, thirds: 0, rank: 1 }
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0) })

describe('Home reveal switch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    state.refreshes = []
    state.results = [row]
    vi.mocked(fetchResults).mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('switches from list to results at revealAt without reload', async () => {
    state.event = ev(new Date(NOW + 3000).toISOString())
    render(<Home />)
    await flush()
    expect(screen.getByText('Brisket Fire')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vote for your top 3' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(screen.getByText('1st')).toBeInTheDocument()
    expect(screen.getByText(/Sam/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Vote for your top 3' })).toBeNull()
  })

  it('re-arms when a refresh moves revealAt later', async () => {
    state.event = ev(new Date(NOW + 3000).toISOString())
    render(<Home />)
    await flush()
    state.event = ev(new Date(NOW + 60_000).toISOString())
    await act(async () => { state.refreshes.forEach((r) => r()) })
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(screen.queryByText('1st')).toBeNull()
    expect(screen.getByRole('link', { name: 'Vote for your top 3' })).toBeInTheDocument()
  })

  it('retries empty results every second', async () => {
    state.event = ev(new Date(NOW - 1000).toISOString())
    state.results = []
    render(<Home />)
    await flush()
    const first = vi.mocked(fetchResults).mock.calls.length
    for (let i = 0; i < 3; i++) await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(vi.mocked(fetchResults).mock.calls.length).toBe(first + 3)
    state.results = [row]
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(screen.getByText('1st')).toBeInTheDocument()
    const n = vi.mocked(fetchResults).mock.calls.length
    for (let i = 0; i < 5; i++) await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(vi.mocked(fetchResults).mock.calls.length).toBe(n)

    // gives up after 10 retries
    state.results = []
    vi.mocked(fetchResults).mockClear()
    cleanup()
    render(<Home />)
    await flush()
    for (let i = 0; i < 15; i++) await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(vi.mocked(fetchResults).mock.calls.length).toBe(11)
  })
})
