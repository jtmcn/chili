import { createHash, timingSafeEqual } from 'node:crypto'
import { fail } from '@/lib/http'

export function requireAdmin(req: Request): Response | null {
  const expected = process.env.ADMIN_PASSCODE
  const given = req.headers.get('x-admin-passcode')
  if (!expected || given === null) return fail('unauthorized', 401)
  // hash first so lengths match and nothing leaks
  const h = (s: string) => createHash('sha256').update(s).digest()
  if (!timingSafeEqual(h(given), h(expected))) return fail('unauthorized', 401)
  return null
}
