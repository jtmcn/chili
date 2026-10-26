import { serverClient } from '@/lib/supabase/server'
import { deviceInput } from '@/lib/schemas'
import { fail, ok } from '@/lib/http'
import type { PublicChili } from '@/lib/types'

export async function POST(req: Request): Promise<Response> {
  const parsed = deviceInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('invalid', 400)

  const { data, error } = await serverClient()
    .from('chilis')
    .select('id,pot_number,name,cook,description,photo_path,chili_allergens(allergen_id)')
    .eq('owner_device_id', parsed.data.deviceId)
    .order('pot_number')
  if (error) return fail('server_error', 500)
  const chilis: PublicChili[] = data.map((r) => ({
    id: r.id,
    potNumber: r.pot_number,
    name: r.name,
    cook: r.cook,
    description: r.description,
    allergenIds: r.chili_allergens.map((a) => a.allergen_id).sort(),
    photoPath: r.photo_path,
  }))
  return ok({ chilis })
}
