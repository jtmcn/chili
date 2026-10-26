import { useEffect, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/lib/post-json', () => ({ postJson: vi.fn() }))
vi.mock('@/lib/device-id', () => ({ getDeviceId: () => 'test-dev' }))
vi.mock('@/lib/chilis', () => ({ fetchChilis: vi.fn() }))
vi.mock('@/lib/event', async (orig) => ({ ...(await orig<typeof import('@/lib/event')>()), fetchEvent: vi.fn() }))
vi.mock('@/lib/live', () => ({
  useLive: <T,>(_t: string[], fetcher: () => Promise<T>) => {
    const [data, setData] = useState<T>()
    useEffect(() => {
      fetcher().then(setData)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
    return { data, error: undefined, refresh: () => {} }
  },
}))

import { postJson } from '@/lib/post-json'
import { fetchChilis } from '@/lib/chilis'
import { fetchEvent } from '@/lib/event'
import BallotPage from '@/app/ballot/page'

const post = vi.mocked(postJson)
const chili = (n: number, name: string) => ({ id: `c${n}`, potNumber: n, name, description: null, cook: null, allergenIds: [], photoPath: null })
const REVEAL = '2030-01-01T20:00:00Z'
const ev = (status: string, revealAt: string | null = REVEAL, serverNow = '2030-01-01T18:00:00Z') =>
  ({ name: 'E', status, revealAt, entriesOpen: false, serverNow }) as never

function route(mine: unknown = { ok: true, picks: null }, save: unknown = { ok: true }) {
  post.mockImplementation((async (url: string) => (url === '/api/ballot/mine' ? mine : save)) as never)
}
const row = (n: number) => screen.getByRole('img', { name: `Pot ${n}` }).closest('li') as HTMLElement
const seg = (n: number, label: string) => within(row(n)).getByRole('button', { name: label })

describe('ballot screen', () => {
  beforeEach(() => {
    localStorage.clear()
    post.mockReset()
    vi.mocked(fetchChilis).mockResolvedValue([chili(4, 'Four'), chili(9, 'Nine'), chili(2, 'Two'), chili(7, 'Seven')])
    vi.mocked(fetchEvent).mockResolvedValue(ev('voting'))
    route()
  })

  it('moves a rank to the last pot tapped', async () => {
    const user = userEvent.setup()
    render(<BallotPage />)
    await screen.findByRole('img', { name: 'Pot 4' })
    await user.click(seg(4, '2nd'))
    await user.click(seg(9, '2nd'))
    expect(seg(9, '2nd')).toHaveAttribute('aria-pressed', 'true')
    expect(seg(4, '2nd')).toHaveAttribute('aria-pressed', 'false')
  })

  it('disables save until all three are picked', async () => {
    const user = userEvent.setup()
    render(<BallotPage />)
    await screen.findByRole('img', { name: 'Pot 4' })
    await user.click(seg(4, '1st'))
    await user.click(seg(9, '2nd'))
    expect(screen.getByRole('button', { name: 'Save my picks' })).toBeDisabled()
  })

  it('saves, clears pending and confirms', async () => {
    const user = userEvent.setup()
    render(<BallotPage />)
    await screen.findByRole('img', { name: 'Pot 4' })
    await user.click(seg(4, '1st'))
    await user.click(seg(9, '2nd'))
    await user.click(seg(2, '3rd'))
    await user.click(screen.getByRole('button', { name: 'Save my picks' }))
    expect(await screen.findByText('Picks saved')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/api/ballot', { picks: ['c4', 'c9', 'c2'] })
    const conf = screen.getByText('Picks saved').parentElement as HTMLElement
    for (const n of ['Four', 'Nine', 'Two']) expect(within(conf).getByText(n)).toBeInTheDocument()
    expect(localStorage.getItem('chili.pendingBallot')).toBeNull()
  })

  it('keeps pending when the save fails on the network', async () => {
    route(undefined, { ok: false, error: 'network', message: 'No connection' })
    const user = userEvent.setup()
    render(<BallotPage />)
    await screen.findByRole('img', { name: 'Pot 4' })
    await user.click(seg(4, '1st'))
    await user.click(seg(9, '2nd'))
    await user.click(seg(2, '3rd'))
    await user.click(screen.getByRole('button', { name: 'Save my picks' }))
    expect(await screen.findByText('No connection')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('chili.pendingBallot')!)).toEqual(['c4', 'c9', 'c2'])
  })

  it('resubmits a pending ballot on mount', async () => {
    localStorage.setItem('chili.pendingBallot', JSON.stringify(['c4', 'c9', 'c2']))
    render(<BallotPage />)
    expect(await screen.findByText('Picks saved')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/api/ballot', { picks: ['c4', 'c9', 'c2'] })
    expect(localStorage.getItem('chili.pendingBallot')).toBeNull()
  })

  it('pre-selects my ballot and offers update', async () => {
    route({ ok: true, picks: ['c9', 'c4', 'c7'] })
    render(<BallotPage />)
    await screen.findByRole('img', { name: 'Pot 4' })
    expect(await screen.findByRole('button', { name: 'Update my picks' })).toBeEnabled()
    expect(seg(9, '1st')).toHaveAttribute('aria-pressed', 'true')
    expect(seg(7, '3rd')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows no controls in setup', async () => {
    vi.mocked(fetchEvent).mockResolvedValue(ev('setup', null))
    render(<BallotPage />)
    expect(await screen.findByText('Voting opens when the host starts it.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('treats voting without reveal time like setup', async () => {
    vi.mocked(fetchEvent).mockResolvedValue(ev('voting', null))
    render(<BallotPage />)
    expect(await screen.findByText('Voting opens when the host starts it.')).toBeInTheDocument()
  })

  it('shows closed when revealed', async () => {
    vi.mocked(fetchEvent).mockResolvedValue(ev('voting', REVEAL, '2030-01-01T21:00:00Z'))
    render(<BallotPage />)
    expect(await screen.findByText(/^Voting is closed\. Results at /)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save my picks' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to all chilis' })).toHaveAttribute('href', '/')
  })

  it('shows closed on a voting_closed error', async () => {
    route(undefined, { ok: false, error: 'voting_closed', message: 'closed' })
    const user = userEvent.setup()
    render(<BallotPage />)
    await screen.findByRole('img', { name: 'Pot 4' })
    await user.click(seg(4, '1st'))
    await user.click(seg(9, '2nd'))
    await user.click(seg(2, '3rd'))
    await user.click(screen.getByRole('button', { name: 'Save my picks' }))
    expect(await screen.findByText(/^Voting is closed\. Results at /)).toBeInTheDocument()
  })

  it('prunes picks for deleted chilis and clears a rejected pending ballot', async () => {
    localStorage.setItem('chili.pendingBallot', JSON.stringify(['c4', 'gone', 'c2']))
    route(undefined, { ok: false, error: 'invalid', message: 'Bad ballot' })
    render(<BallotPage />)
    await screen.findByText('Bad ballot')
    expect(localStorage.getItem('chili.pendingBallot')).toBeNull()
    expect(screen.getByRole('button', { name: 'Save my picks' })).toBeDisabled()
    expect(screen.getByText('Not picked')).toBeInTheDocument()
    expect(seg(4, '1st')).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps setup copy when voting_closed arrives during setup', async () => {
    vi.mocked(fetchEvent).mockResolvedValue(ev('setup', null))
    route(undefined, { ok: false, error: 'voting_closed', message: 'closed' })
    localStorage.setItem('chili.pendingBallot', JSON.stringify(['c4', 'c9', 'c2']))
    render(<BallotPage />)
    await vi.waitFor(() => expect(post).toHaveBeenCalledWith('/api/ballot', expect.anything()))
    expect(await screen.findByText('Voting opens when the host starts it.')).toBeInTheDocument()
    expect(screen.queryByText(/Voting is closed/)).toBeNull()
  })

  it('hides the confirmation when a pick changes', async () => {
    const user = userEvent.setup()
    render(<BallotPage />)
    await screen.findByRole('img', { name: 'Pot 4' })
    await user.click(seg(4, '1st'))
    await user.click(seg(9, '2nd'))
    await user.click(seg(2, '3rd'))
    await user.click(screen.getByRole('button', { name: 'Save my picks' }))
    await screen.findByText('Picks saved')
    await user.click(seg(7, '3rd'))
    expect(screen.queryByText('Picks saved')).toBeNull()
  })
})
