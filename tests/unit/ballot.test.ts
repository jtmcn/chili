import { beforeEach, describe, expect, it } from 'vitest'
import { clearPending, isComplete, loadPending, savePending, setPick, type Picks } from '@/lib/ballot'

describe('ballot picks', () => {
  beforeEach(() => localStorage.clear())

  it('moves a chili to its new rank and clears the old one', () => {
    expect(setPick(['a', null, null], 1, 'a')).toEqual([null, 'a', null])
  })

  it('replaces whoever held the rank', () => {
    expect(setPick(['a', 'b', null], 0, 'b')).toEqual(['b', null, null])
  })

  it('is complete only with all three', () => {
    expect(isComplete(['a', 'b', null])).toBe(false)
    expect(isComplete(['a', 'b', 'c'])).toBe(true)
  })

  it('round-trips the pending ballot', () => {
    const p: Picks = ['a', 'b', 'c']
    savePending(p)
    expect(loadPending()).toEqual(p)
    clearPending()
    expect(loadPending()).toBeNull()
  })

  it('ignores a corrupt pending ballot', () => {
    localStorage.setItem('chili.pendingBallot', '{nope')
    expect(loadPending()).toBeNull()
  })
})
