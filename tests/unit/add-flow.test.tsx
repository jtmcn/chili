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
import AddPage from '@/app/add/page'

const post = vi.mocked(postJson)

async function toReview(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/chili name/i), 'Brisket Fire')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Skip' }))
  await user.click(await screen.findByRole('button', { name: 'Milk' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
}

describe('add flow', () => {
  beforeEach(() => post.mockReset())

  it('walks through to success', async () => {
    post.mockResolvedValue({ ok: true, potNumber: 7 } as never)
    const user = userEvent.setup()
    render(<AddPage />)
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    await toReview(user)
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText("Allergen info comes from the cook; ask them if you're unsure.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add my chili' }))
    expect(await screen.findByRole('img', { name: 'Pot 7' })).toBeInTheDocument()
    expect(screen.getByText('Write this on your table card')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith(
      '/api/chili',
      expect.objectContaining({ name: 'Brisket Fire', allergens: ['milk'] }),
    )
  })

  it('shows a server error on step 1', async () => {
    post.mockResolvedValue({ ok: false, error: 'name_taken', message: 'That name is taken.' })
    const user = userEvent.setup()
    render(<AddPage />)
    await toReview(user)
    await user.click(screen.getByRole('button', { name: 'Add my chili' }))
    const msg = await screen.findByText('That name is taken.')
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    expect(msg).toHaveClass('text-chili')
    const input = screen.getByLabelText(/chili name/i)
    expect(input).toHaveAttribute('aria-describedby', msg.id)
  })
})

describe('allergen load failure', () => {
  it('shows an error with retry on step 3 and blocks Next', async () => {
    vi.mocked(fetchAllergens).mockRejectedValueOnce(new Error('x'))
    const user = userEvent.setup()
    render(<AddPage />)
    await user.type(screen.getByLabelText(/chili name/i), 'Brisket Fire')
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
