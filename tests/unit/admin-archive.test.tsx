import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const post = vi.fn()
vi.mock('@/components/admin/AdminGate', () => ({ useAdminPost: () => post }))

import { AdminArchive } from '@/components/admin/AdminArchive'
import type { EventState } from '@/lib/types'

const now = new Date('2026-10-26T04:00:00Z')
const revealed: EventState = {
  name: 'Overlook Chili Cook-Off', status: 'voting', entriesOpen: false,
  revealAt: '2026-10-26T02:00:00Z', serverNow: now.toISOString(),
}
const local = new Date(revealed.revealAt!)
const p = (n: number) => String(n).padStart(2, '0')
const localDate = `${local.getFullYear()}-${p(local.getMonth() + 1)}-${p(local.getDate())}`

beforeEach(() => {
  post.mockReset()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('AdminArchive', () => {
  it('renders nothing before the reveal', () => {
    const { container } = render(
      <AdminArchive event={{ ...revealed, revealAt: '2026-10-26T05:00:00Z' }} archivedYear={null} onChange={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("defaults to the reveal's local year and date", () => {
    render(<AdminArchive event={revealed} archivedYear={null} onChange={() => {}} />)
    expect(screen.getByLabelText('Year')).toHaveValue(local.getFullYear())
    expect(screen.getByLabelText('Date')).toHaveValue(localDate)
  })

  it('posts year and date, then refreshes', async () => {
    post.mockResolvedValue({ ok: true, year: local.getFullYear(), archived: 5, missingPhotos: [] })
    const onChange = vi.fn()
    render(<AdminArchive event={revealed} archivedYear={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive this year' }))
    expect(post).toHaveBeenCalledWith('/api/admin/archive', { year: local.getFullYear(), heldOn: localDate })
    expect(onChange).toHaveBeenCalled()
  })

  it('asks to confirm the year and date, and sends nothing if declined', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    render(<AdminArchive event={revealed} archivedYear={null} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive this year' }))
    expect(window.confirm).toHaveBeenCalledWith(`Archive as ${local.getFullYear()} (${localDate})? The year can't be changed later.`)
    expect(post).not.toHaveBeenCalled()
  })

  it('shows the archived state with a history link and photo re-check', () => {
    render(<AdminArchive event={revealed} archivedYear={2026} onChange={() => {}} />)
    expect(screen.getByText('Archived as 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View history' })).toHaveAttribute('href', '/history/2026')
    expect(screen.getByRole('button', { name: 'Re-check photos' })).toBeInTheDocument()
  })

  it("warns when photos didn't copy", async () => {
    post.mockResolvedValue({ ok: true, year: 2026, archived: null, missingPhotos: ['2026/a/1.jpg', '2026/b/2.jpg'] })
    render(<AdminArchive event={revealed} archivedYear={2026} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Re-check photos' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("2 photo(s) didn't copy. Try again.")
  })

  it('shows a server error', async () => {
    post.mockResolvedValue({ ok: false, error: 'already_archived', message: 'This event is already archived.' })
    render(<AdminArchive event={revealed} archivedYear={null} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive this year' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This event is already archived.')
  })
})
