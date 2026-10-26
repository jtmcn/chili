import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mintVoterToken, verifyVoterToken, voterId } from '@/lib/voter'

const req = (cookie?: string) => new Request('http://localhost/api', { headers: cookie ? { cookie } : {} })

describe('voter token', () => {
  beforeEach(() => vi.stubEnv('VOTER_SECRET', 'test-secret'))
  afterEach(() => vi.unstubAllEnvs())

  it('round-trips a minted token', () => {
    const token = mintVoterToken()!
    expect(verifyVoterToken(token)).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('rejects a forged or tampered token', () => {
    const [, sig] = mintVoterToken()!.split('.')
    expect(verifyVoterToken(`${crypto.randomUUID()}.${sig}`)).toBeNull()
    expect(verifyVoterToken(crypto.randomUUID())).toBeNull()
    expect(verifyVoterToken('')).toBeNull()
  })

  it('rejects tokens signed with another secret', () => {
    const token = mintVoterToken()!
    vi.stubEnv('VOTER_SECRET', 'other')
    expect(verifyVoterToken(token)).toBeNull()
  })

  it('fails closed without a secret', () => {
    const token = mintVoterToken()!
    vi.stubEnv('VOTER_SECRET', '')
    expect(mintVoterToken()).toBeNull()
    expect(verifyVoterToken(token)).toBeNull()
  })

  it('reads the voter from the cookie header', () => {
    const token = mintVoterToken()!
    expect(voterId(req(`a=1; chili_voter=${token}; b=2`))).toBe(token.split('.')[0])
    expect(voterId(req('chili_device_id=x'))).toBeNull()
    expect(voterId(req())).toBeNull()
  })
})
