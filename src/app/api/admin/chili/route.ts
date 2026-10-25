import { requireAdmin } from '@/lib/admin-auth'
import { fail, fromDbError, ok } from '@/lib/http'
import { adminChiliInput } from '@/lib/schemas'
import { serverClient } from '@/lib/supabase/server'

export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req)
  if (denied) return denied

  const parsed = adminChiliInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('invalid', 400)
  const v = parsed.data
  const db = serverClient()

  if (v.action === 'create') {
    const { data, error } = await db.rpc('create_chili', {
      p_device_id: 'admin',
      p_name: v.name,
      // nullable text params; generated types omit null
      p_cook: (v.cook || null) as string,
      p_description: (v.description || null) as string,
      p_allergens: v.allergens ?? [],
      p_as_admin: true,
    })
    if (error) return fromDbError(error)
    return ok({ potNumber: data }, 201)
  }
  if (v.action === 'update') {
    const { error } = await db.rpc('admin_update_chili', {
      p_chili_id: v.chiliId,
      // explicit nulls: PostgREST needs every arg present to resolve the function
      p_name: (v.name ?? null) as string,
      p_cook: (v.cook ?? null) as string,
      p_description: (v.description ?? null) as string,
      p_allergens: (v.allergens ?? null) as string[],
      p_pot_number: (v.potNumber ?? null) as number,
    })
    if (error) return fromDbError(error)
    return ok({})
  }
  const { error } = await db.rpc('admin_delete_chili', { p_chili_id: v.chiliId })
  if (error) return fromDbError(error)
  return ok({})
}
