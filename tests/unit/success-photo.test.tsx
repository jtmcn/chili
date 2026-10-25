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

  it('shows the server message on failure and allows retry', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ok: false, error: 'not_owner', message: 'You can only edit chilis added from this phone.' }, { status: 403 }),
    )
    const user = userEvent.setup()
    render(<Success potNumber={7} chiliId="c1" />)
    await pick(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('You can only edit chilis added from this phone.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fetchMock.mockResolvedValue(Response.json({ ok: true, photoUrl: 'http://x/p.jpg' }))
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Photo added')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
