import { beforeEach, describe, expect, it } from 'vitest'
import { POST } from '@/app/api/chili/route'
import { call, resetDb, setEvent } from './helpers'

const valid = { deviceId: 'test-dev-1', name: 'TEST Red Hot', allergens: ['milk'] }

beforeEach(resetDb)

describe('POST /api/chili', () => {
  it('creates a chili', async () => {
    const r = await call(POST, valid)
    expect(r.status).toBe(201)
    expect(r.json.ok).toBe(true)
    expect(r.json.potNumber).toBeGreaterThanOrEqual(1)
  })
  it('accepts noAllergens', async () => {
    const r = await call(POST, { deviceId: 'test-dev-1', name: 'TEST Plain', noAllergens: true })
    expect(r.status).toBe(201)
  })
  it('rejects neither allergens nor noAllergens', async () => {
    expect((await call(POST, { deviceId: 'test-dev-1', name: 'TEST Nope' })).status).toBe(400)
  })
  it('rejects both', async () => {
    expect((await call(POST, { ...valid, noAllergens: true })).status).toBe(400)
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
})
