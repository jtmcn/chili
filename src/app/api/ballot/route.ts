import { checkBotId } from 'botid/server'
import { serverClient } from '@/lib/supabase/server'
import { ballotInput } from '@/lib/schemas'
import { fail, fromDbError, ok } from '@/lib/http'
import { voterId } from '@/lib/voter'

export async function POST(req: Request): Promise<Response> {
  if ((await checkBotId()).isBot) return fail('bot', 403)
  const voter = voterId(req)
  if (!voter) return fail('no_voter', 401)

  const body = await req.json().catch(() => null)
  const parsed = ballotInput.safeParse(body)
  if (!parsed.success) return fail('invalid', 400)
  const v = parsed.data

  const { error } = await serverClient().rpc('submit_ballot', {
    p_device_id: voter,
    p_first: v.picks[0],
    p_second: v.picks[1],
    p_third: v.picks[2],
  })
  if (error) return fromDbError(error)
  return ok({})
}
