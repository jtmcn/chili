import { serverClient } from '@/lib/supabase/server'
import { deviceInput } from '@/lib/schemas'
import { fail, ok } from '@/lib/http'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const parsed = deviceInput.safeParse(body)
  if (!parsed.success) return fail('invalid', 400)

  const { data, error } = await serverClient()
    .from('ballots')
    .select('first_id,second_id,third_id')
    .eq('device_id', parsed.data.deviceId)
    .maybeSingle()
  if (error) return fail('server_error', 500)
  return ok({ picks: data ? [data.first_id, data.second_id, data.third_id] : null })
}
