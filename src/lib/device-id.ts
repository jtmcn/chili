const KEY = 'chili.deviceId'
const COOKIE = 'chili_device_id'

function readCookie(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

function writeCookie(id: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(id)}; max-age=31536000; path=/; SameSite=Lax`
}

// Cookie is a fallback so the id survives localStorage being cleared.
export function getDeviceId(): string {
  let id: string | null = null
  try {
    id = localStorage.getItem(KEY)
  } catch {}
  id ??= readCookie()
  id ??= crypto.randomUUID()
  try {
    localStorage.setItem(KEY, id)
  } catch {}
  writeCookie(id)
  return id
}
