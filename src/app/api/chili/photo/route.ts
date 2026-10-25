import { fail, fromDbError, ok } from '@/lib/http'
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, photoUrl } from '@/lib/photo'
import { photoInput } from '@/lib/schemas'
import { serverClient } from '@/lib/supabase/server'

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData().catch(() => null)
  if (!form) return fail('invalid', 400)
  const parsed = photoInput.safeParse({ deviceId: form.get('deviceId'), chiliId: form.get('chiliId') })
  const file = form.get('file')
  if (!parsed.success || !(file instanceof Blob) || file.type !== 'image/jpeg' || file.size === 0 || file.size > PHOTO_MAX_BYTES) {
    return fail('invalid', 400)
  }
  // Declared MIME is client-controlled; require the JPEG SOI marker.
  const soi = new Uint8Array(await file.slice(0, 3).arrayBuffer())
  if (soi[0] !== 0xff || soi[1] !== 0xd8 || soi[2] !== 0xff) return fail('invalid', 400)
  const { deviceId, chiliId } = parsed.data

  const db = serverClient()
  // Cheap precheck so strangers can't write objects; the RPC stays the authority.
  const owner = await db.from('chilis').select('owner_device_id').eq('id', chiliId).maybeSingle()
  if (owner.error) return fail('server_error', 500)
  if (!owner.data) return fail('invalid', 400)
  if (owner.data.owner_device_id !== deviceId) return fail('not_owner', 403)

  const path = `${chiliId}/${crypto.randomUUID()}.jpg`
  const up = await db.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: 'image/jpeg', upsert: false })
  if (up.error) return fail('server_error', 500)

  // RPC also enforces the reveal cutoff; drop any object it rejects
  const { error } = await db.rpc('set_chili_photo', { p_device_id: deviceId, p_chili_id: chiliId, p_path: path })
  if (error) {
    await db.storage.from(PHOTO_BUCKET).remove([path])
    return fromDbError(error)
  }
  return ok({ photoUrl: photoUrl(path) })
}
