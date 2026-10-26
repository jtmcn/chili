import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/live-channel', () => ({ subscribeLive: () => () => {} }))
vi.mock('@/lib/reference', () => ({ fetchTags: vi.fn().mockResolvedValue([{ id: 'spicy', label: 'Spicy', sort: 1 }]) }))
vi.mock('@/lib/history', () => ({ fetchPastEvents: vi.fn(), fetchPastYear: vi.fn() }))

import { History } from '@/components/History'
import { HistoryYear } from '@/components/HistoryYear'
import { Results } from '@/components/Results'
import { fetchPastEvents, fetchPastYear, type PastEvent } from '@/lib/history'
import type { ResultRow } from '@/lib/types'

const ev: PastEvent = {
  year: 2026, name: 'Overlook Chili Cook-Off', heldOn: '2026-10-25', ballotCount: 22, chiliCount: 5,
  podium: [{ rank: 1, name: 'Maximalist Pork Green Chili', cook: 'Jo' }],
}
const row = (o: Partial<ResultRow>): ResultRow => ({
  chiliId: '2026-1', potNumber: 1, name: 'Maximalist Pork Green Chili', cook: 'Jo',
  points: 41, firsts: 8, seconds: 5, thirds: 7, rank: 1, photoPath: null, ...o,
})

beforeEach(() => vi.mocked(fetchPastYear).mockReset())

describe('History', () => {
  it('lists each year with counts and links to it', async () => {
    vi.mocked(fetchPastEvents).mockResolvedValue([ev])
    render(<History />)
    expect(await screen.findByText('2026 · Overlook Chili Cook-Off')).toBeInTheDocument()
    expect(screen.getByText('5 chilis · 22 ballots')).toBeInTheDocument()
    expect(screen.getByText(/Maximalist Pork Green Chili/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /2026/ })).toHaveAttribute('href', '/history/2026')
  })

  it('has an empty state', async () => {
    vi.mocked(fetchPastEvents).mockResolvedValue([])
    render(<History />)
    expect(await screen.findByText('No past cook-offs yet.')).toBeInTheDocument()
  })
})

describe('HistoryYear', () => {
  it('shows the heading and rows in rank order with tags', async () => {
    vi.mocked(fetchPastYear).mockResolvedValue({
      event: ev,
      rows: [row({}), row({ chiliId: '2026-3', potNumber: 3, name: 'Chile Colorado con Papas', rank: 2, points: 35 })],
      tagCounts: [{ chiliId: '2026-1', tagId: 'spicy', count: 3 }],
    })
    render(<HistoryYear year="2026" />)
    expect(await screen.findByRole('heading', { name: 'Overlook Chili Cook-Off, 2026' })).toBeInTheDocument()
    const names = screen.getAllByText(/Maximalist|Colorado/).map((e) => e.textContent)
    expect(names).toEqual(['Maximalist Pork Green Chili', 'Chile Colorado con Papas'])
    expect(await screen.findByText('Spicy')).toHaveTextContent('Spicy 3')
  })

  it('shows T-1st for a zero-ballot year', async () => {
    vi.mocked(fetchPastYear).mockResolvedValue({
      event: { ...ev, ballotCount: 0 },
      rows: [row({ points: 0, firsts: 0, rank: 1 }), row({ chiliId: '2026-2', potNumber: 2, name: 'B', points: 0, firsts: 0, rank: 1 })],
      tagCounts: [],
    })
    render(<HistoryYear year="2026" />)
    expect(await screen.findAllByText('T-1st')).toHaveLength(2)
  })

  it('handles a year with no record', async () => {
    vi.mocked(fetchPastYear).mockResolvedValue(null)
    render(<HistoryYear year="2031" />)
    expect(await screen.findByText('No cook-off on record for 2031.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All past cook-offs' })).toHaveAttribute('href', '/history')
  })

  it("doesn't fetch a non-numeric year", async () => {
    render(<HistoryYear year="abc" />)
    expect(await screen.findByText('No cook-off on record for abc.')).toBeInTheDocument()
    expect(fetchPastYear).not.toHaveBeenCalled()
  })
})

describe('Results photo', () => {
  it('renders a thumbnail when photoPath is set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
    render(<Results rows={[row({ photoPath: '2026/a/p.jpg' })]} topTags={() => []} />)
    expect(screen.getByRole('img', { name: 'Photo of Maximalist Pork Green Chili' })).toBeInTheDocument()
  })
})
