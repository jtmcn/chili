export const PHOTO_BUCKET = 'chili-photos'
export const PHOTO_MAX_BYTES = 1048576

export function photoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`
}

// Fits within max×max; 'from-image' applies EXIF rotation from phone cameras.
export async function resizeToJpeg(file: File, max = 1024, quality = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality),
  )
}

const FAILED = "Couldn't upload the photo. Try again."
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// retry: worth resending (network or 5xx); 4xx is final.
export type UploadResult = { ok: true; photoUrl: string } | { ok: false; message: string; retry: boolean }

// Multipart, so not postJson; same policy: retry thrown fetches and 5xx only.
export async function uploadPhoto(
  fields: { deviceId: string; chiliId: string; file: Blob },
  { retries = 3, delayMs = 500 } = {},
): Promise<UploadResult> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(delayMs * attempt)
    const body = new FormData()
    body.set('deviceId', fields.deviceId)
    body.set('chiliId', fields.chiliId)
    body.set('file', fields.file, 'photo.jpg')
    try {
      const res = await fetch('/api/chili/photo', { method: 'POST', body })
      if (res.status >= 500 && attempt < retries) continue
      const json = await res.json().catch(() => null)
      if (json?.ok) return { ok: true, photoUrl: json.photoUrl }
      return { ok: false, message: json?.message ?? FAILED, retry: res.status >= 500 || !json }
    } catch {
      // fall through to retry
    }
  }
  return { ok: false, message: FAILED, retry: true }
}
