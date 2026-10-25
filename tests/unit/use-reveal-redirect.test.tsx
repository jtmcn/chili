import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const replace = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

import { useRevealRedirect } from '@/lib/use-reveal-redirect'

const NOW = Date.parse('2030-01-01T18:00:00Z')
const ev = (revealAt: string | null, serverNow = '2030-01-01T18:00:00Z') =>
  ({ name: 'E', status: 'voting', revealAt, entriesOpen: false, serverNow }) as never

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  replace.mockClear()
})
afterEach(() => vi.useRealTimers())

describe('useRevealRedirect', () => {
  it('redirects at revealAt', () => {
    renderHook(() => useRevealRedirect(ev('2030-01-01T18:00:10Z'), 0))
    vi.advanceTimersByTime(9_999)
    expect(replace).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('re-arms when revealAt moves', () => {
    const { rerender } = renderHook(({ at }) => useRevealRedirect(ev(at), 0), { initialProps: { at: '2030-01-01T18:00:10Z' } })
    rerender({ at: '2030-01-01T18:00:30Z' })
    vi.advanceTimersByTime(10_000)
    expect(replace).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20_000)
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('redirects immediately when already revealed', () => {
    renderHook(() => useRevealRedirect(ev('2030-01-01T17:00:00Z'), 0))
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('does nothing without a reveal time and clears on unmount', () => {
    renderHook(() => useRevealRedirect(ev(null), 0))
    const { unmount } = renderHook(() => useRevealRedirect(ev('2030-01-01T18:00:10Z'), 0))
    unmount()
    vi.advanceTimersByTime(60_000)
    expect(replace).not.toHaveBeenCalled()
  })
})
