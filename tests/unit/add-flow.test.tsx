import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/post-json', () => ({ postJson: vi.fn() }))
vi.mock('@/lib/reference', () => ({
  fetchAllergens: vi.fn().mockResolvedValue([
    { id: 'milk', label: 'Milk', sort: 1 },
    { id: 'eggs', label: 'Eggs', sort: 2 },
  ]),
}))

import { postJson } from '@/lib/post-json'
import { fetchAllergens } from '@/lib/reference'
import { Wizard } from '@/components/add/Wizard'

const post = vi.mocked(postJson)

async function toReview(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/chili name/i), 'Brisket Fire')
  await user.type(screen.getByLabelText(/your name/i), 'Pat')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Skip' }))
  await user.click(await screen.findByRole('button', { name: 'Milk' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
}

describe('add flow', () => {
  beforeEach(() => post.mockReset())

  it('walks through to success', async () => {
    post.mockResolvedValue({ ok: true, potNumber: 7, chiliId: 'c7' } as never)
    const user = userEvent.setup()
    render(<Wizard />)
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    await toReview(user)
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText("Allergen info comes from the cook; ask them if you're unsure.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add my chili' }))
    expect(await screen.findByRole('img', { name: 'Pot 7' })).toBeInTheDocument()
    expect(screen.getByText('Write this on your table card')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith(
      '/api/chili',
      expect.objectContaining({ name: 'Brisket Fire', cook: 'Pat', allergens: ['milk'] }),
    )
  })

  it('needs a cook name before Next', async () => {
    const user = userEvent.setup()
    render(<Wizard />)
    await user.type(screen.getByLabelText(/chili name/i), 'Brisket Fire')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.type(screen.getByLabelText(/your name/i), ' ')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.type(screen.getByLabelText(/your name/i), 'Pat')
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('shows a server error on step 1', async () => {
    post.mockResolvedValue({ ok: false, error: 'name_taken', message: 'That name is taken.' })
    const user = userEvent.setup()
    render(<Wizard />)
    await toReview(user)
    await user.click(screen.getByRole('button', { name: 'Add my chili' }))
    const msg = await screen.findByText('That name is taken.')
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    expect(msg).toHaveClass('text-chili')
    const input = screen.getByLabelText(/chili name/i)
    expect(input).toHaveAttribute('aria-describedby', msg.id)
  })
})

describe('edit mode', () => {
  beforeEach(() => post.mockReset())
  const mine = { id: 'c3', potNumber: 3, name: 'Old Name', cook: 'Pat', description: null, allergenIds: [], photoPath: null }

  it('reopens an owned chili on review and saves to /api/chili/update', async () => {
    post.mockResolvedValueOnce({ ok: true, chilis: [mine] } as never)
    post.mockResolvedValueOnce({ ok: true, potNumber: 3, chiliId: 'c3' } as never)
    const user = userEvent.setup()
    render(<Wizard editId="c3" />)
    expect(await screen.findByText('Ready to save?')).toBeInTheDocument()
    expect(screen.getByText('No allergens')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Edit\s*name$/ }))
    await user.clear(screen.getByLabelText(/chili name/i))
    await user.type(screen.getByLabelText(/chili name/i), 'New Name')
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: /Next|Skip/ }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('img', { name: 'Pot 3' })).toBeInTheDocument()
    expect(post).toHaveBeenLastCalledWith(
      '/api/chili/update',
      expect.objectContaining({ chiliId: 'c3', name: 'New Name', cook: 'Pat', noAllergens: true }),
    )
  })

  it("says so when this phone doesn't own the chili", async () => {
    post.mockResolvedValueOnce({ ok: true, chilis: [] } as never)
    render(<Wizard editId="c3" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('You can only edit chilis added from this phone.')
  })
})

describe('allergen load failure', () => {
  it('shows an error with retry on step 3 and blocks Next', async () => {
    vi.mocked(fetchAllergens).mockRejectedValueOnce(new Error('x'))
    const user = userEvent.setup()
    render(<Wizard />)
    await user.type(screen.getByLabelText(/chili name/i), 'Brisket Fire')
    await user.type(screen.getByLabelText(/your name/i), 'Pat')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load the allergen list.")
    await user.click(screen.getByRole('button', { name: 'None of these' }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('button', { name: 'Milk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })
})
