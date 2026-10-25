import { fail, fromDbError, ok } from '@/lib/http'
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, photoUrl } from '@/lib/photo'
import { photoInput } from '@/lib/schemas'
import { serverClient } from '@/lib/supabase/server'

export async function POST(req: Request): Promise<Response> {
  const form = await req.formData().catch(() => null)
  if (!form) return fail('invalid', 400)
  const parsed = photoInput.safeParse({ deviceId: form.get('deviceId'), chiliId: form.get('chiliId') })
  const file = form.get('file')
  if (!parsed.success || !(file instanceof Blob) || file.type !== 'image/jpeg' || file.size > PHOTO_MAX_BYTES) {
    return fail('invalid', 400)
  }
  const { deviceId, chiliId } = parsed.data

  const db = serverClient()
  const path = `${chiliId}/${crypto.randomUUID()}.jpg`
  const up = await db.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: 'image/jpeg', upsert: false })
  if (up.error) return fail('server_error', 500)

  // Ownership is checked here, so a rejected upload is cleaned up after the fact.
  const { error } = await db.rpc('set_chili_photo', { p_device_id: deviceId, p_chili_id: chiliId, p_path: path })
  if (error) {
    await db.storage.from(PHOTO_BUCKET).remove([path])
    return fromDbError(error)
  }
  return ok({ photoUrl: photoUrl(path) })
}
