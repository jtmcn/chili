import { serverClient } from '@/lib/supabase/server'
import { chiliInput } from '@/lib/schemas'
import { fail, fromDbError, ok } from '@/lib/http'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null)
  const parsed = chiliInput.safeParse(body)
  if (!parsed.success) return fail('invalid', 400)
  const v = parsed.data

  const { data, error } = await serverClient().rpc('create_chili', {
    p_device_id: v.deviceId,
    p_name: v.name,
    // nullable text params; generated types omit null
    p_cook: (v.cook || null) as string,
    p_description: (v.description || null) as string,
    p_allergens: v.noAllergens ? [] : v.allergens!,
  })
  if (error) return fromDbError(error)
  return ok({ potNumber: data }, 201)
}
