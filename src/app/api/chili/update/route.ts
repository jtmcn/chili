import { serverClient } from '@/lib/supabase/server'
import { chiliUpdateInput } from '@/lib/schemas'
import { fail, fromDbError, ok } from '@/lib/http'

export async function POST(req: Request): Promise<Response> {
  const parsed = chiliUpdateInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('invalid', 400)
  const v = parsed.data

  const { data, error } = await serverClient().rpc('update_chili', {
    p_device_id: v.deviceId,
    p_chili_id: v.chiliId,
    p_name: v.name,
    p_cook: v.cook,
    // nullable text param; generated types omit null
    p_description: (v.description || null) as string,
    p_allergens: v.noAllergens ? [] : v.allergens!,
  })
  if (error) return fromDbError(error)
  return ok({ potNumber: data, chiliId: v.chiliId })
}
