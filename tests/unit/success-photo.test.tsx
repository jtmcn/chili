import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/photo', async (orig) => ({
  ...(await orig<typeof import('@/lib/photo')>()),
  resizeToJpeg: vi.fn().mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' })),
}))

import { Success } from '@/components/add/Success'

const fetchMock = vi.fn()
const pick = async (user: ReturnType<typeof userEvent.setup>) =>
  user.upload(screen.getByLabelText('Add a photo'), new File(['raw'], 'p.heic', { type: 'image/heic' }))

describe('Success photo', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lets the OS offer camera or library', () => {
    render(<Success potNumber={7} chiliId="c1" />)
    const input = screen.getByLabelText('Add a photo')
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).not.toHaveAttribute('capture')
  })

  it('uploads and shows "Photo added"', async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true, photoUrl: 'http://x/p.jpg' }))
    const user = userEvent.setup()
    render(<Success potNumber={7} chiliId="c1" />)
    expect(screen.getByText('Write this on your table card')).toBeInTheDocument()
    await pick(user)
    expect(await screen.findByText('Photo added')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Your chili photo' })).toHaveAttribute('src', 'http://x/p.jpg')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/chili/photo')
    const body = init.body as FormData
    expect(body.get('chiliId')).toBe('c1')
    expect((body.get('file') as File).type).toBe('image/jpeg')
  })

  it('shows a 4xx message without retry', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ok: false, error: 'not_owner', message: 'You can only edit chilis added from this phone.' }, { status: 403 }),
    )
    const user = userEvent.setup()
    render(<Success potNumber={7} chiliId="c1" />)
    await pick(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('You can only edit chilis added from this phone.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers retry after a server error', async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ ok: false, error: 'server_error', message: 'Something went wrong. Try again.' }, { status: 500 }),
    )
    const user = userEvent.setup()
    render(<Success potNumber={7} chiliId="c1" />)
    await pick(user)
    // real backoff: 0.5 + 1 + 1.5 s
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent('Something went wrong. Try again.')
    expect(fetchMock).toHaveBeenCalledTimes(4)
    fetchMock.mockResolvedValue(Response.json({ ok: true, photoUrl: 'http://x/p.jpg' }))
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Photo added')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(5)
  }, 10_000)
})
