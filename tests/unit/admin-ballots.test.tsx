import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminBallots } from '@/components/admin/AdminBallots'

describe('AdminBallots', () => {
  beforeEach(() => localStorage.clear())

  it('warns once ballots exceed the expected guests', async () => {
    const user = userEvent.setup()
    render(<AdminBallots ballotCount={12} />)
    expect(screen.getByText('12 ballots in')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Guests expected'), '20')
    expect(screen.queryByRole('alert')).toBeNull()
    await user.clear(screen.getByLabelText('Guests expected'))
    await user.type(screen.getByLabelText('Guests expected'), '10')
    expect(screen.getByRole('alert')).toHaveTextContent('More ballots than guests')
  })

  it('remembers the guest count', async () => {
    localStorage.setItem('chili.admin.guests', '5')
    render(<AdminBallots ballotCount={6} />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Guests expected')).toHaveValue(5)
  })
})
