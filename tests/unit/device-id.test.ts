import { beforeEach, describe, expect, it } from 'vitest'
import { getDeviceId } from '@/lib/device-id'

function clearCookie() {
  document.cookie = 'chili_device_id=; max-age=0; path=/'
}

describe('getDeviceId', () => {
  beforeEach(() => {
    localStorage.clear()
    clearCookie()
  })

  it('creates and persists a uuid', () => {
    const a = getDeviceId()
    const b = getDeviceId()
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f-]{36}$/)
    expect(localStorage.getItem('chili.deviceId')).toBe(a)
    expect(document.cookie).toContain(a)
  })

  it('restores from cookie when localStorage is cleared', () => {
    document.cookie = 'chili_device_id=abc; path=/'
    localStorage.clear()
    expect(getDeviceId()).toBe('abc')
    expect(localStorage.getItem('chili.deviceId')).toBe('abc')
  })
})
