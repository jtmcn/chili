import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export const VOTER_COOKIE = 'chili_voter'

const sign = (id: string, secret: string) => createHmac('sha256', secret).update(id).digest('base64url')

// Server-signed so a script can't mint voters by sending random ids.
export function mintVoterToken(): string | null {
  const secret = process.env.VOTER_SECRET
  if (!secret) return null
  const id = randomUUID()
  return `${id}.${sign(id, secret)}`
}

export function verifyVoterToken(token: string | undefined): string | null {
  const secret = process.env.VOTER_SECRET
  if (!secret || !token) return null
  const dot = token.indexOf('.')
  if (dot < 1) return null
  const id = token.slice(0, dot)
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(sign(id, secret))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  return id
}

export function voterId(req: Request): string | null {
  const m = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${VOTER_COOKIE}=([^;]*)`))
  return verifyVoterToken(m?.[1])
}
