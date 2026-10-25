import { requireAdmin } from '@/lib/admin-auth'
import { fail, ok } from '@/lib/http'
import { adminEventInput } from '@/lib/schemas'
import { serverClient } from '@/lib/supabase/server'

export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req)
  if (denied) return denied

  const parsed = adminEventInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('invalid', 400)
  const v = parsed.data
  const db = serverClient()

  const patch: { status?: string; entries_open?: boolean; reveal_at?: string | null } = {}
  if (v.status !== undefined) patch.status = v.status
  if (v.entriesOpen !== undefined) patch.entries_open = v.entriesOpen
  if (v.revealAt !== undefined) patch.reveal_at = v.revealAt
  if (Object.keys(patch).length) {
    const { error } = await db.from('event').update(patch).eq('id', 1)
    if (error) return fail('server_error', 500)
  }
  if (v.revealNow) {
    // DB clock, so "close voting early" can't skew with the app server
    const { error } = await db.rpc('admin_reveal_now')
    if (error) return fail('server_error', 500)
  }
  return ok({})
}
