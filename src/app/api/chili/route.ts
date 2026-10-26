import { serverClient } from '@/lib/supabase/server'
import { chiliInput } from '@/lib/schemas'
import { fail, fromDbError, isPotTaken, ok } from '@/lib/http'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const parsed = chiliInput.safeParse(body)
  if (!parsed.success) return fail('invalid', 400)
  const v = parsed.data

  const db = serverClient()
  // A host-assigned pot can collide with the sequence; each failed insert advances it.
  let res
  for (let i = 0; i < 5; i++) {
    res = await db.rpc('create_chili', {
      p_device_id: v.deviceId,
      p_name: v.name,
      p_cook: v.cook,
      // nullable text param; generated types omit null
      p_description: (v.description || null) as string,
      p_allergens: v.noAllergens ? [] : v.allergens!,
    })
    if (!res.error || !isPotTaken(res.error)) break
  }
  const { data, error } = res!
  if (error) return fromDbError(error)
  const row = await db.from('chilis').select('id').eq('pot_number', data).single()
  if (row.error) return fail('server_error', 500)
  return ok({ potNumber: data, chiliId: row.data.id }, 201)
}
