import { spawnSync } from 'node:child_process'
import { beforeEach, describe, expect, it } from 'vitest'
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

describe('npm run event -- archive / reset', () => {
  it('archive before reveal exits 1 and prints not_revealed', () => {
    const r = run('archive', '--year', '2099', '--held-on', '2099-10-25')
    expect(r.status).toBe(1)
    expect(r.out).toContain('not_revealed')
  })

  it('archive copies photos under the year and keeps the originals', async () => {
    await reveal()
    const r = run('archive', '--year', '2099', '--held-on', '2099-10-25')
    expect(r.out).not.toContain('✗')
    expect(r.status).toBe(0)
    expect(await list(`2099/${withPhoto}`)).toHaveLength(1)
    expect(await list(withPhoto)).toHaveLength(1)
    expect((await db().from('past_chilis').select('name').eq('year', 2099)).data).toHaveLength(3)
  })

  it("archive re-run copies only what's missing", async () => {
    await reveal()
    run('archive', '--year', '2099', '--held-on', '2099-10-25')
    const [name] = await list(`2099/${withPhoto}`)
    await db().storage.from('chili-photos').remove([`2099/${withPhoto}/${name}`])
    const r = run('archive', '--year', '2099', '--held-on', '2099-10-25')
    expect(r.status).toBe(0)
    expect(r.out).toContain('already archived')
    expect(await list(`2099/${withPhoto}`)).toEqual([name])
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
    run('archive', '--year', '2099', '--held-on', '2099-10-25')
    const r = run('reset', '--yes')
    expect(r.status).toBe(0)
    expect(await list(withPhoto)).toEqual([])
    expect(await list(`2099/${withPhoto}`)).toHaveLength(1)
  })

  it('reset refuses while an archived photo is missing, keeping the live copy', async () => {
    await reveal()
    run('archive', '--year', '2099', '--held-on', '2099-10-25')
    const [name] = await list(`2099/${withPhoto}`)
    await db().storage.from('chili-photos').remove([`2099/${withPhoto}/${name}`])
    const r = run('reset', '--yes')
    expect(r.status).toBe(1)
    expect(r.out).toContain('re-run archive')
    expect(await list(withPhoto)).toHaveLength(1)
    expect((await db().from('chilis').select('id')).data).toHaveLength(3)
  })
})
