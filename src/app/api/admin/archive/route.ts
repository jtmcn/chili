import type { PostgrestError } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { archiveEvent } from '@/lib/archive'
import { fail, fromDbError, ok } from '@/lib/http'
import { adminArchiveInput } from '@/lib/schemas'
import { serverClient } from '@/lib/supabase/server'

export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req)
  if (denied) return denied

  const parsed = adminArchiveInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('invalid', 400)
  const { year, heldOn } = parsed.data
  try {
    return ok({ year, ...(await archiveEvent(serverClient(), year, heldOn)) })
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e) return fromDbError(e as PostgrestError)
    return fail('server_error', 500)
  }
}
