import { createHash, timingSafeEqual } from 'node:crypto'
import { fail, ok } from '@/lib/http'
import { serverClient } from '@/lib/supabase/server'

// Vercel Cron hits this daily so the free-tier Supabase project never idles into a pause.
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  const given = req.headers.get('authorization')
  if (!secret || given === null) return fail('unauthorized', 401)
  const h = (s: string) => createHash('sha256').update(s).digest()
  if (!timingSafeEqual(h(given), h(`Bearer ${secret}`))) return fail('unauthorized', 401)

  const { error } = await serverClient().rpc('get_event')
  if (error) {
    // nobody watches this route; the log is the only trace of a failed keep-alive
    console.error('keepalive', error)
    return fail('server_error', 500)
  }
  return ok({})
}
