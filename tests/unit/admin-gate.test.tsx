import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/post-json', () => ({ postJson: vi.fn() }))

import { postJson } from '@/lib/post-json'
import { AdminGate } from '@/components/admin/AdminGate'

const post = vi.mocked(postJson)

describe('AdminGate', () => {
  beforeEach(() => {
    sessionStorage.clear()
    post.mockReset()
  })

  it('shows a passcode field', () => {
    render(<AdminGate>secret</AdminGate>)
    expect(screen.getByLabelText('Passcode')).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('shows the error and stores nothing on 401', async () => {
    post.mockResolvedValue({ ok: false, error: 'unauthorized', message: 'Wrong passcode.' })
    render(<AdminGate>secret</AdminGate>)
    await userEvent.type(screen.getByLabelText('Passcode'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText('Wrong passcode.')).toBeInTheDocument()
    expect(sessionStorage.getItem('chili.adminPasscode')).toBeNull()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/api/admin/state', {}, { headers: { 'x-admin-passcode': 'nope' } })
  })

  it('stores the passcode and renders children on 200', async () => {
    post.mockResolvedValue({ ok: true })
    render(<AdminGate>secret</AdminGate>)
    await userEvent.type(screen.getByLabelText('Passcode'), 'hunter2')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText('secret')).toBeInTheDocument()
    expect(sessionStorage.getItem('chili.adminPasscode')).toBe('hunter2')
  })
})
