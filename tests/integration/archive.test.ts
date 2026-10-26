import { beforeEach, describe, expect, it } from 'vitest'
import { POST as ARCHIVE } from '@/app/api/admin/archive/route'
import { POST as BALLOT } from '@/app/api/ballot/route'
import { POST as CHILI } from '@/app/api/chili/route'
import { POST as PHOTO } from '@/app/api/chili/photo/route'
import { call, db, resetDb, setEvent } from './helpers'

const H = { 'x-admin-passcode': 'test-passcode' }
const body = { year: 2099, heldOn: '2099-10-25' }
const list = async (prefix: string) => ((await db().storage.from('chili-photos').list(prefix)).data ?? []).map((o) => o.name)
const reveal = () => setEvent({ reveal_at: new Date(Date.now() - 60_000).toISOString() })

let withPhoto: string
beforeEach(async () => {
  await resetDb()
  await setEvent({ status: 'voting', reveal_at: new Date(Date.now() + 3600_000).toISOString() })
  withPhoto = (await call(CHILI, { deviceId: 'test-dev-1', name: 'TEST Pictured', cook: 'Pat', noAllergens: true })).json.chiliId
  const other = (await call(CHILI, { deviceId: 'test-dev-2', name: 'TEST Plain', cook: 'Sam', noAllergens: true })).json.chiliId
  const third = (await call(CHILI, { deviceId: 'test-dev-3', name: 'TEST Third', cook: 'Cy', noAllergens: true })).json.chiliId
  const fd = new FormData()
  fd.set('deviceId', 'test-dev-1')
  fd.set('chiliId', withPhoto)
  const jpeg = new Uint8Array(64).fill(0xff)
  jpeg.set([0xff, 0xd8, 0xff])
  fd.set('file', new Blob([jpeg], { type: 'image/jpeg' }), 'p.jpg')
  expect((await PHOTO(new Request('http://localhost/api/chili/photo', { method: 'POST', body: fd }))).status).toBe(200)
  expect((await call(BALLOT, { deviceId: 'voter-1', picks: [withPhoto, other, third] })).status).toBe(200)
})

describe('POST /api/admin/archive', () => {
  it('401 without the passcode', async () => {
    expect((await call(ARCHIVE, body)).status).toBe(401)
  })

  it('400 for a malformed date or a 5-digit year', async () => {
    expect((await call(ARCHIVE, { ...body, heldOn: '25/10/2099' }, H)).status).toBe(400)
    expect((await call(ARCHIVE, { ...body, year: 20990 }, H)).status).toBe(400)
  })

  it('409 not_revealed before the reveal, writing nothing', async () => {
    const r = await call(ARCHIVE, body, H)
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('not_revealed')
    expect((await db().from('past_events').select('year')).data).toEqual([])
  })

  it('archives rows and copies photos, keeping the originals', async () => {
    await reveal()
    const r = await call(ARCHIVE, body, H)
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ ok: true, year: 2099, archived: 3, missingPhotos: [] })
    expect(await list(`2099/${withPhoto}`)).toHaveLength(1)
    expect(await list(withPhoto)).toHaveLength(1)
  })

  it('a same-year re-run skips the DB step and restores a missing copy', async () => {
    await reveal()
    await call(ARCHIVE, body, H)
    const [name] = await list(`2099/${withPhoto}`)
    await db().storage.from('chili-photos').remove([`2099/${withPhoto}/${name}`])
    const r = await call(ARCHIVE, body, H)
    expect(r.status).toBe(200)
    expect(r.json).toMatchObject({ archived: null, missingPhotos: [] })
    expect(await list(`2099/${withPhoto}`)).toEqual([name])
    expect((await db().from('past_chilis').select('name').eq('year', 2099)).data).toHaveLength(3)
  })

  it('409 already_archived for a different year', async () => {
    await reveal()
    await call(ARCHIVE, body, H)
    const r = await call(ARCHIVE, { ...body, year: 2100 }, H)
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('already_archived')
  })

  it('reports a photo whose live source is gone', async () => {
    const [name] = await list(withPhoto)
    await db().storage.from('chili-photos').remove([`${withPhoto}/${name}`])
    await reveal()
    const r = await call(ARCHIVE, body, H)
    expect(r.status).toBe(200)
    expect(r.json.missingPhotos).toEqual([`2099/${withPhoto}/${name}`])
  })
})
