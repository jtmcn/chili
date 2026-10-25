import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const unsubscribe = vi.fn()
let ping: (t: string) => void = () => {}
vi.mock('@/lib/live-channel', () => ({
  subscribeLive: vi.fn((cb: (t: string) => void) => {
    ping = cb
    return unsubscribe
  }),
}))

import { useLive } from '@/lib/live'

beforeEach(() => {
  vi.useFakeTimers()
  unsubscribe.mockClear()
})
afterEach(() => vi.useRealTimers())

async function mount(fetcher = vi.fn().mockResolvedValue(1)) {
  const hook = renderHook(() => useLive(['chilis'], fetcher))
  await act(async () => {})
  return { fetcher, ...hook }
}

describe('useLive', () => {
  it('fetches once on mount and exposes data', async () => {
    const { fetcher, result } = await mount()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.data).toBe(1)
  })

  it('refetches on matching ping, ignores others', async () => {
    const { fetcher } = await mount()
    await act(async () => ping('ballots'))
    expect(fetcher).toHaveBeenCalledTimes(1)
    await act(async () => ping('chilis'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('refetches every interval', async () => {
    const { fetcher } = await mount()
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('refetches when the page becomes visible', async () => {
    const { fetcher } = await mount()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('cleans up on unmount', async () => {
    const { fetcher, unmount } = await mount()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('drops stale responses', async () => {
    let resolveFirst!: (v: string) => void
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => new Promise<string>((r) => (resolveFirst = r)))
      .mockResolvedValueOnce('new')
    const { result } = renderHook(() => useLive(['chilis'], fetcher))
    await act(async () => ping('chilis'))
    expect(result.current.data).toBe('new')
    await act(async () => resolveFirst('old'))
    expect(result.current.data).toBe('new')
  })

  it('applies in-flight responses that are newer than the last applied', async () => {
    const res: Array<(v: string) => void> = []
    const fetcher = vi.fn(() => new Promise<string>((r) => res.push(r)))
    const { result } = renderHook(() => useLive(['chilis'], fetcher))
    await act(async () => ping('chilis'))
    await act(async () => res[0]('first'))
    expect(result.current.data).toBe('first')
    await act(async () => res[1]('second'))
    expect(result.current.data).toBe('second')
  })
})
