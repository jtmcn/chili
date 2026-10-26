import { spawnSync } from 'node:child_process'
import { beforeEach, describe, expect, it } from 'vitest'
import { POST as ARCHIVE } from '@/app/api/admin/archive/route'
import { POST as BALLOT } from '@/app/api/ballot/route'
import { POST as CHILI } from '@/app/api/chili/route'
import { POST as PHOTO } from '@/app/api/chili/photo/route'
import { call, db, resetDb, setEvent } from './helpers'

// No --env-file here, so the script only ever sees the local test env.
function run(...args: string[]) {
  db() // refuses a non-local URL before the script can touch it
  const r = spawnSync(process.execPath, ['scripts/event.mts', ...args], { env: process.env, encoding: 'utf8' })
  return { status: r.status, out: `${r.stdout}${r.stderr}` }
}

const list = async (prefix: string) => ((await db().storage.from('chili-photos').list(prefix)).data ?? []).map((o) => o.name)

let withPhoto: string
beforeEach(async () => {
  await resetDb()
  // live photos left by other files would otherwise be counted here
  const stray = await db().storage.from('chili-photos').list('', { limit: 1000 })
  for (const dir of stray.data ?? []) {
    const inner = (await db().storage.from('chili-photos').list(dir.name)).data ?? []
    if (inner.length) await db().storage.from('chili-photos').remove(inner.map((o) => `${dir.name}/${o.name}`))
  }
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

const reveal = () => setEvent({ reveal_at: new Date(Date.now() - 60_000).toISOString() })
const archive = () => call(ARCHIVE, { year: 2099, heldOn: '2099-10-25' }, { 'x-admin-passcode': 'test-passcode' })

describe('npm run event -- reset', () => {
  it('archive is no longer a CLI command', () => {
    const r = run('archive')
    expect(r.status).toBe(1)
    expect(r.out).toContain('Usage:')
  })

  it('reset refuses an unarchived event', async () => {
    const r = run('reset', '--yes')
    expect(r.status).toBe(1)
    expect(r.out).toContain('--force')
    expect((await db().from('chilis').select('id')).data).toHaveLength(3)
    expect(await list(withPhoto)).toHaveLength(1)
  })

  it('reset after archive keeps archived photos', async () => {
    await reveal()
    await archive()
    const r = run('reset', '--yes')
    expect(r.status).toBe(0)
    expect(await list(withPhoto)).toEqual([])
    expect(await list(`2099/${withPhoto}`)).toHaveLength(1)
  })

  it('reset refuses while an archived photo is missing, keeping the live copy', async () => {
    await reveal()
    await archive()
    const [name] = await list(`2099/${withPhoto}`)
    await db().storage.from('chili-photos').remove([`2099/${withPhoto}/${name}`])
    const r = run('reset', '--yes')
    expect(r.status).toBe(1)
    expect(r.out).toContain('re-check photos')
    expect(await list(withPhoto)).toHaveLength(1)
    expect((await db().from('chilis').select('id')).data).toHaveLength(3)
  })
})
