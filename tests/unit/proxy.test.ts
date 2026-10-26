// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { mintVoterToken, verifyVoterToken } from '@/lib/voter'

const visit = (cookie?: string) => proxy(new NextRequest('http://localhost/ballot', { headers: cookie ? { cookie } : {} }))

describe('proxy', () => {
  beforeEach(() => vi.stubEnv('VOTER_SECRET', 'test-secret'))
  afterEach(() => vi.unstubAllEnvs())

  it('issues a signed httpOnly voter cookie on first visit', () => {
    const c = visit().cookies.get('chili_voter')!
    expect(verifyVoterToken(c.value)).not.toBeNull()
    expect(c.httpOnly).toBe(true)
  })

  it('keeps a valid voter cookie', () => {
    expect(visit(`chili_voter=${mintVoterToken()}`).cookies.get('chili_voter')).toBeUndefined()
  })

  it('replaces a forged voter cookie', () => {
    const c = visit(`chili_voter=${crypto.randomUUID()}.forged`).cookies.get('chili_voter')!
    expect(verifyVoterToken(c.value)).not.toBeNull()
  })
})
