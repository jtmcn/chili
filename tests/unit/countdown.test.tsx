import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'

vi.mock('@/lib/chilis', () => ({ fetchChilis: vi.fn(async () => []) }))
vi.mock('@/lib/reference', () => ({ fetchAllergens: vi.fn(async () => []), fetchTags: vi.fn(async () => []) }))
vi.mock('@/lib/tags', () => ({ fetchTagCounts: vi.fn(async () => []) }))
vi.mock('@/lib/event', async (orig) => ({
  ...(await orig<typeof import('@/lib/event')>()),
  fetchEvent: vi.fn(),
  fetchBallotCount: vi.fn(async () => 23),
}))
vi.mock('@/lib/live', async () => {
  const { useEffect, useState } = await import('react')
  return {
    useLive: <T,>(_t: string[], fetcher: () => Promise<T>) => {
      const [data, setData] = useState<T>()
      useEffect(() => {
        fetcher().then(setData)
      }, []) // eslint-disable-line react-hooks/exhaustive-deps
      return { data, error: undefined, refresh: () => {} }
    },
  }
})

import { fetchEvent } from '@/lib/event'
import { Countdown } from '@/components/Countdown'
import { Home } from '@/components/Home'

const NOW = Date.parse('2030-01-01T18:00:00Z')

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('counts down against server time, not the phone clock', () => {
    // Phone is 10 min fast: server now = Date.now() - 600_000.
    vi.setSystemTime(NOW + 600_000)
    render(<Countdown revealAt={new Date(NOW + 90_000).toISOString()} offsetMs={-600_000} />)
    expect(screen.getByText('1:30')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('1:29')).toBeInTheDocument()
  })

  it('uses H:MM:SS at an hour or more', () => {
    render(<Countdown revealAt={new Date(NOW + 4_360_000).toISOString()} offsetMs={0} />)
    expect(screen.getByText('1:12:40')).toBeInTheDocument()
  })

  it('says when the time is unset', () => {
    render(<Countdown revealAt={null} offsetMs={0} />)
    expect(screen.getByText('Reveal time not set')).toBeInTheDocument()
  })

  it('says revealing at zero', () => {
    render(<Countdown revealAt={new Date(NOW).toISOString()} offsetMs={0} />)
    expect(screen.getByText('Revealing…')).toBeInTheDocument()
  })
})

describe('Home vote link', () => {
  beforeEach(() => vi.useRealTimers())
  const ev = (status: string) =>
    ({ name: 'E', status, revealAt: '2030-01-01T20:00:00Z', entriesOpen: false, serverNow: '2030-01-01T18:00:00Z' }) as never

  it('shows in voting and the header shows the ballot count', async () => {
    vi.mocked(fetchEvent).mockResolvedValue(ev('voting'))
    render(<Home />)
    const link = await screen.findByRole('link', { name: 'Vote for your top 3' })
    expect(link).toHaveAttribute('href', '/ballot')
    expect(await screen.findByText('23 ballots in')).toBeInTheDocument()
  })

  it('is absent in setup', async () => {
    vi.mocked(fetchEvent).mockResolvedValue(ev('setup'))
    render(<Home />)
    await screen.findByText('E')
    expect(screen.queryByRole('link', { name: 'Vote for your top 3' })).toBeNull()
  })
})
