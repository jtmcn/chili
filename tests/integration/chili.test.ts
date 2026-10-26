import { beforeEach, describe, expect, it } from 'vitest'
import { POST } from '@/app/api/chili/route'
import { POST as UPDATE } from '@/app/api/chili/update/route'
import { POST as MINE } from '@/app/api/chili/mine/route'
import { call, db, resetDb, setEvent } from './helpers'

const valid = { deviceId: 'test-dev-1', name: 'TEST Red Hot', cook: 'Pat', allergens: ['milk'] }

beforeEach(resetDb)

describe('POST /api/chili', () => {
  it('creates a chili', async () => {
    const r = await call(POST, valid)
    expect(r.status).toBe(201)
    expect(r.json.ok).toBe(true)
    expect(r.json.potNumber).toBeGreaterThanOrEqual(1)
    const row = (await db().from('chilis').select('id').eq('pot_number', r.json.potNumber).single()).data!
    expect(r.json.chiliId).toBe(row.id)
  })
  it('accepts noAllergens', async () => {
    const r = await call(POST, { deviceId: 'test-dev-1', name: 'TEST Plain', cook: 'Pat', noAllergens: true })
    expect(r.status).toBe(201)
  })
  it('rejects neither allergens nor noAllergens', async () => {
    expect((await call(POST, { deviceId: 'test-dev-1', name: 'TEST Nope', cook: 'Pat' })).status).toBe(400)
  })
  it('rejects both', async () => {
    expect((await call(POST, { ...valid, noAllergens: true })).status).toBe(400)
  })
  it('rejects a missing or blank cook', async () => {
    expect((await call(POST, { ...valid, cook: undefined })).status).toBe(400)
    expect((await call(POST, { ...valid, cook: '   ' })).status).toBe(400)
  })
  it('rejects a 1-char name', async () => {
    expect((await call(POST, { ...valid, name: 'T' })).status).toBe(400)
  })
  it('rejects duplicate names', async () => {
    await call(POST, valid)
    const r = await call(POST, { ...valid, deviceId: 'test-dev-2', name: 'test red hot' })
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('name_taken')
    expect(r.json.message).toBe('That name is already taken. Try another.')
  })
  it('403 when entries are closed', async () => {
    await setEvent({ entries_open: false })
    const r = await call(POST, valid)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('entries_closed')
  })
  it('retries when a host-assigned pot collides with the sequence', async () => {
    const first = await call(POST, valid)
    // take the next sequence value by hand
    const next = first.json.potNumber + 1
    const { error } = await db().from('chilis').update({ pot_number: next }).eq('pot_number', first.json.potNumber)
    expect(error).toBeNull()
    const r = await call(POST, { deviceId: 'test-dev-2', name: 'TEST Second', cook: 'Sam', allergens: ['milk'] })
    expect(r.status).toBe(201)
    expect(r.json.potNumber).not.toBe(next)
  })
})

describe('POST /api/chili/update and /mine', () => {
  let chiliId: string
  beforeEach(async () => {
    chiliId = (await call(POST, valid)).json.chiliId
  })

  it('mine returns only this device\'s chilis, with cook', async () => {
    await call(POST, { ...valid, deviceId: 'test-dev-2', name: 'TEST Other' })
    const r = await call(MINE, { deviceId: 'test-dev-1' })
    expect(r.status).toBe(200)
    expect(r.json.chilis).toEqual([expect.objectContaining({ id: chiliId, name: 'TEST Red Hot', cook: 'Pat', allergenIds: ['milk'] })])
  })
  it('owner updates fields and replaces allergens, pot unchanged', async () => {
    const pot = (await call(MINE, { deviceId: 'test-dev-1' })).json.chilis[0].potNumber
    const r = await call(UPDATE, { ...valid, chiliId, name: 'TEST Renamed', cook: 'Pat B', description: 'Hot', allergens: ['soy', 'eggs'] })
    expect(r.status).toBe(200)
    expect(r.json.potNumber).toBe(pot)
    const [c] = (await call(MINE, { deviceId: 'test-dev-1' })).json.chilis
    expect(c).toMatchObject({ name: 'TEST Renamed', cook: 'Pat B', description: 'Hot', allergenIds: ['eggs', 'soy'] })
  })
  it('owner can edit while entries are closed', async () => {
    await setEvent({ entries_open: false })
    expect((await call(UPDATE, { ...valid, chiliId, noAllergens: true, allergens: undefined })).status).toBe(200)
  })
  it('other device is 403 not_owner', async () => {
    const r = await call(UPDATE, { ...valid, deviceId: 'test-dev-2', chiliId })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('not_owner')
  })
  it('rejects edits after reveal', async () => {
    await setEvent({ status: 'voting', reveal_at: new Date(Date.now() - 60_000).toISOString() })
    const r = await call(UPDATE, { ...valid, chiliId })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('entries_closed')
  })
  it('renaming onto a taken name is 409 name_taken', async () => {
    await call(POST, { ...valid, deviceId: 'test-dev-2', name: 'TEST Other' })
    const r = await call(UPDATE, { ...valid, chiliId, name: 'test other' })
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('name_taken')
  })
})
