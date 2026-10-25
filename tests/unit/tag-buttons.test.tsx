import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/post-json', () => ({ postJson: vi.fn() }))
vi.mock('@/lib/device-id', () => ({ getDeviceId: () => 'dev-1' }))
import { postJson } from '@/lib/post-json'
import { TagButtons } from '@/components/TagButtons'

const tags = [
  { id: 'smoky', label: 'Smoky', sort: 1 },
  { id: 'meaty', label: 'Meaty', sort: 2 },
]
const counts = [{ chiliId: 'c1', tagId: 'smoky', count: 4 }]
const post = vi.mocked(postJson)

const setup = (enabled = true) =>
  render(<TagButtons chiliId="c1" tags={tags} counts={counts} enabled={enabled} />)

beforeEach(() => {
  localStorage.clear()
  post.mockReset()
})

describe('TagButtons', () => {
  it('toggles on with immediate count, pressed state and check', async () => {
    post.mockResolvedValue({ ok: true })
    setup()
    fireEvent.click(screen.getByRole('button', { name: /Smoky 4/ }))
    const btn = screen.getByRole('button', { name: /Smoky 5/ })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn.textContent).toMatch(/^✓/)
    expect(post).toHaveBeenCalledWith('/api/tag', { chiliId: 'c1', tagId: 'smoky', deviceId: 'dev-1', on: true })
    await waitFor(() => expect(btn).not.toBeDisabled())
    expect(localStorage.getItem('chili.myTags')).toContain('c1:smoky')
  })

  it('sends on:false when tapped again', async () => {
    post.mockResolvedValue({ ok: true })
    setup()
    fireEvent.click(screen.getByRole('button', { name: /Smoky 4/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Smoky 5/ })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /Smoky 5/ }))
    expect(post).toHaveBeenLastCalledWith('/api/tag', expect.objectContaining({ on: false }))
    expect(screen.getByRole('button', { name: /Smoky 4/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reverts the count when the post fails', async () => {
    post.mockResolvedValue({ ok: false, error: 'network', message: 'x' })
    setup()
    fireEvent.click(screen.getByRole('button', { name: /Smoky 4/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Smoky 4/ })).toHaveAttribute('aria-pressed', 'false'))
    expect(localStorage.getItem('chili.myTags')).toBeNull()
  })

  it('is disabled when not enabled', () => {
    setup(false)
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled()
  })
})
