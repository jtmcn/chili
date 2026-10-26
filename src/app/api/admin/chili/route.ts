import { requireAdmin } from '@/lib/admin-auth'
import { fail, fromDbError, isPotTaken, ok } from '@/lib/http'
import { PHOTO_BUCKET } from '@/lib/photo'
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
    // Retry sequence collisions with host-assigned pots; each failed insert advances it.
    let res
    for (let i = 0; i < 5; i++) {
      res = await db.rpc('create_chili', {
        p_device_id: 'admin',
        p_name: v.name,
        p_cook: v.cook,
        // nullable text param; generated types omit null
        p_description: (v.description || null) as string,
        p_allergens: v.allergens ?? [],
        p_as_admin: true,
      })
      if (!res.error || !isPotTaken(res.error)) break
    }
    const { data, error } = res!
    if (error) return fromDbError(error)
    let pot = data
    if (v.potNumber && v.potNumber !== data) {
      // chili already exists if this fails (e.g. pot taken); the error is surfaced
      const moved = await db.rpc('admin_update_chili', {
        p_chili_id: (await db.from('chilis').select('id').eq('pot_number', data).single()).data!.id,
        p_name: null as unknown as string, p_cook: null as unknown as string,
        p_description: null as unknown as string, p_allergens: null as unknown as string[],
        p_pot_number: v.potNumber,
      })
      if (moved.error) return fromDbError(moved.error)
      pot = v.potNumber
    }
    return ok({ potNumber: pot }, 201)
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
  const photo = await db.from('chilis').select('photo_path').eq('id', v.chiliId).maybeSingle()
  if (photo.error) return fail('server_error', 500)
  const { error } = v.action === 'removePhoto'
    ? await db.rpc('admin_set_chili_photo', { p_chili_id: v.chiliId, p_path: null as unknown as string })
    : await db.rpc('admin_delete_chili', { p_chili_id: v.chiliId })
  if (error) return fromDbError(error)
  // best-effort: the row change already succeeded
  if (photo.data?.photo_path) await db.storage.from(PHOTO_BUCKET).remove([photo.data.photo_path])
  return ok({})
}
