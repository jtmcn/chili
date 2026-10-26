import { NextResponse, type NextRequest } from 'next/server'
import { mintVoterToken, VOTER_COOKIE, verifyVoterToken } from '@/lib/voter'

export function proxy(req: NextRequest) {
  const res = NextResponse.next()
  if (verifyVoterToken(req.cookies.get(VOTER_COOKIE)?.value)) return res
  const token = mintVoterToken()
  if (token) {
    res.cookies.set(VOTER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return res
}

// Pages only: the ballot API must never mint its own voter.
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
