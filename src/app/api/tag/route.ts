import { serverClient } from '@/lib/supabase/server'
import { tagInput } from '@/lib/schemas'
import { fail, fromDbError, ok } from '@/lib/http'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const parsed = tagInput.safeParse(body)
  if (!parsed.success) return fail('invalid', 400)
  const v = parsed.data

  const { error } = await serverClient().rpc('set_tag', {
    p_chili_id: v.chiliId,
    p_tag_id: v.tagId,
    p_device_id: v.deviceId,
    p_on: v.on,
  })
  if (error) return fromDbError(error)
  return ok({})
}
