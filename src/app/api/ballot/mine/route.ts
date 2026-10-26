import { serverClient } from '@/lib/supabase/server'
import { fail, ok } from '@/lib/http'
import { voterId } from '@/lib/voter'

export async function POST(req: Request): Promise<Response> {
  const voter = voterId(req)
  if (!voter) return ok({ picks: null })

  const { data, error } = await serverClient()
    .from('ballots')
    .select('first_id,second_id,third_id')
    .eq('device_id', voter)
    .maybeSingle()
  if (error) return fail('server_error', 500)
  return ok({ picks: data ? [data.first_id, data.second_id, data.third_id] : null })
}
