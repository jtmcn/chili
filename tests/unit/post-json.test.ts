import { afterEach, describe, expect, it, vi } from 'vitest'
import { postJson } from '@/lib/post-json'

const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

afterEach(() => vi.unstubAllGlobals())

describe('postJson', () => {
  it('retries thrown fetches then succeeds', async () => {
    const f = vi
      .fn()
      .mockRejectedValueOnce(new Error('x'))
      .mockRejectedValueOnce(new Error('x'))
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce(res(201, { ok: true, potNumber: 7 }))
    vi.stubGlobal('fetch', f)
    const r = await postJson('/api/chili', {}, { delayMs: 0 })
    expect(r).toEqual({ ok: true, potNumber: 7 })
    expect(f).toHaveBeenCalledTimes(4)
  })

  it('does not retry a 409 and returns the server result', async () => {
    const body = { ok: false, error: 'name_taken', message: 'Taken' }
    const f = vi.fn().mockResolvedValue(res(409, body))
    vi.stubGlobal('fetch', f)
    expect(await postJson('/api/chili', {}, { delayMs: 0 })).toEqual(body)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('retries a 5xx', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(res(503, { ok: false, error: 'x', message: 'x' }))
      .mockResolvedValueOnce(res(201, { ok: true }))
    vi.stubGlobal('fetch', f)
    expect(await postJson('/x', {}, { delayMs: 0 })).toEqual({ ok: true })
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('returns a network error after exhausting retries', async () => {
    const f = vi.fn().mockRejectedValue(new Error('x'))
    vi.stubGlobal('fetch', f)
    const r = await postJson('/x', {}, { delayMs: 0 })
    expect(r).toEqual({ ok: false, error: 'network', message: "No connection. We'll keep trying." })
    expect(f).toHaveBeenCalledTimes(4)
  })
})

describe('postJson non-JSON bodies', () => {
  it('does not retry a 4xx with a non-JSON body', async () => {
    const f = vi.fn().mockResolvedValue(new Response('<html>', { status: 413 }))
    vi.stubGlobal('fetch', f)
    expect(await postJson('/x', {}, { delayMs: 0 })).toEqual({ ok: false, error: 'server_error', message: 'Something went wrong. Try again.' })
    expect(f).toHaveBeenCalledTimes(1)
  })
})
