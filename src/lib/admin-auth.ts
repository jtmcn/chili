import { timingSafeEqual } from 'node:crypto'
import { fail } from '@/lib/http'

export function requireAdmin(req: Request): Response | null {
  const expected = process.env.ADMIN_PASSCODE
  const given = req.headers.get('x-admin-passcode')
  if (!expected || given === null) return fail('unauthorized', 401)
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return fail('unauthorized', 401)
  return null
}
