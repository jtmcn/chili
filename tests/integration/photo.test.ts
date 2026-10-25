import { beforeEach, describe, expect, it } from 'vitest'
import { POST as CHILI } from '@/app/api/chili/route'
import { POST as PHOTO } from '@/app/api/chili/photo/route'
import { POST as ADMIN } from '@/app/api/admin/chili/route'
import { call, db, resetDb } from './helpers'

const H = { 'x-admin-passcode': 'test-passcode' }
// Minimal JPEG magic bytes; the route only checks type and size.
const jpeg = (size = 1024) => new Blob([new Uint8Array(size).fill(0xff)], { type: 'image/jpeg' })

async function upload(deviceId: string, chiliId: string, file: Blob) {
  const fd = new FormData()
  fd.set('deviceId', deviceId)
  fd.set('chiliId', chiliId)
  fd.set('file', file, 'photo.jpg')
  const res = await PHOTO(new Request('http://localhost/api/chili/photo', { method: 'POST', body: fd }))
  return { status: res.status, json: await res.json() }
}

const photoPath = async (id: string) =>
  (await db().rpc('get_chilis')).data!.find((c) => c.id === id)?.photo_path ?? null

let chiliId: string
beforeEach(async () => {
  await resetDb()
  const r = await call(CHILI, { deviceId: 'test-dev-1', name: 'TEST Photo', noAllergens: true })
  chiliId = r.json.chiliId
})

describe('POST /api/chili/photo', () => {
  it('owner upload sets photo_path', async () => {
    const r = await upload('test-dev-1', chiliId, jpeg())
    expect(r.status).toBe(200)
    const path = await photoPath(chiliId)
    expect(path).toMatch(new RegExp(`^${chiliId}/[0-9a-f-]{36}\\.jpg$`))
    expect(r.json.photoUrl).toContain(`/storage/v1/object/public/chili-photos/${path}`)
  })
  it('other device is 403 not_owner and leaves no object', async () => {
    const r = await upload('test-dev-2', chiliId, jpeg())
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('not_owner')
    expect(await photoPath(chiliId)).toBeNull()
    const { data } = await db().storage.from('chili-photos').list(chiliId)
    expect(data).toEqual([])
  })
  it('rejects non-JPEG', async () => {
    const r = await upload('test-dev-1', chiliId, new Blob(['x'], { type: 'image/png' }))
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('invalid')
  })
  it('rejects > 1 MB', async () => {
    expect((await upload('test-dev-1', chiliId, jpeg(1048577))).status).toBe(400)
  })
  it('rejects a bad chiliId', async () => {
    expect((await upload('test-dev-1', 'nope', jpeg())).status).toBe(400)
  })
  it('admin removePhoto clears photo_path', async () => {
    await upload('test-dev-1', chiliId, jpeg())
    const r = await call(ADMIN, { action: 'removePhoto', chiliId }, H)
    expect(r.status).toBe(200)
    expect(await photoPath(chiliId)).toBeNull()
  })
})
