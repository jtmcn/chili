import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const replace = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

import { useRevealRedirect } from '@/lib/use-reveal-redirect'
import type { Phase } from '@/lib/types'

beforeEach(() => replace.mockClear())

describe('useRevealRedirect', () => {
  it('redirects once the Phase turns revealed', () => {
    const { rerender } = renderHook(({ phase }) => useRevealRedirect(phase), {
      initialProps: { phase: 'voting' as Phase | undefined },
    })
    expect(replace).not.toHaveBeenCalled()
    rerender({ phase: 'revealed' })
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('does nothing before the Event loads or during Setup', () => {
    renderHook(() => useRevealRedirect(undefined))
    renderHook(() => useRevealRedirect('setup'))
    expect(replace).not.toHaveBeenCalled()
  })
})
