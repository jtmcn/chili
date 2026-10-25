import { serverClient } from '@/lib/supabase/server'
import { ballotInput } from '@/lib/schemas'
import { fail, fromDbError, ok } from '@/lib/http'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const parsed = ballotInput.safeParse(body)
  if (!parsed.success) return fail('invalid', 400)
  const v = parsed.data

  const { error } = await serverClient().rpc('submit_ballot', {
    p_device_id: v.deviceId,
    p_first: v.picks[0],
    p_second: v.picks[1],
    p_third: v.picks[2],
  })
  if (error) return fromDbError(error)
  return ok({})
}
