import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { POST as STATE } from '@/app/api/admin/state/route'
import { POST as CHILI } from '@/app/api/admin/chili/route'
import { POST as EVENT } from '@/app/api/admin/event/route'
import type { Database } from '@/lib/database.types'
import { call, resetDb, setEvent } from './helpers'

const svc = () => createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const H = { 'x-admin-passcode': 'test-passcode' }
const create = (name: string) => call(CHILI, { action: 'create', name }, H)
const idOf = async (name: string) => (await svc().from('chilis').select('id').eq('name', name).single()).data!.id

beforeEach(resetDb)

describe('admin auth', () => {
  for (const [label, h] of [STATE, CHILI, EVENT].map((r, i) => [['state', 'chili', 'event'][i], r] as const)) {
    it(`${label}: 401 with no header and a wrong header`, async () => {
      expect((await call(h, {})).status).toBe(401)
      expect((await call(h, {}, { 'x-admin-passcode': 'nope' })).status).toBe(401)
    })
  }
  it('401 when ADMIN_PASSCODE is unset', async () => {
    const saved = process.env.ADMIN_PASSCODE
    delete process.env.ADMIN_PASSCODE
    try {
      expect((await call(STATE, {}, H)).status).toBe(401)
      expect((await call(STATE, {}, { 'x-admin-passcode': '' })).status).toBe(401)
    } finally {
      process.env.ADMIN_PASSCODE = saved
    }
  })
})

describe('admin chili', () => {
  it('creates while entries are closed', async () => {
    await setEvent({ entries_open: false })
    const r = await create('TEST Admin A')
    expect(r.status).toBe(201)
    expect(r.json.potNumber).toBeTypeOf('number')
  })
  it('update to a taken pot number is 409 pot_taken', async () => {
    const a = (await create('TEST Admin A')).json.potNumber
    await create('TEST Admin B')
    const r = await call(CHILI, { action: 'update', chiliId: await idOf('TEST Admin B'), potNumber: a }, H)
    expect(r.status).toBe(409)
    expect(r.json).toMatchObject({ error: 'pot_taken' })
  })
  it('create with potNumber assigns it', async () => {
    const r = await call(CHILI, { action: 'create', name: 'TEST Admin A', potNumber: 42 }, H)
    expect(r.json.potNumber).toBe(42)
    expect((await svc().from('chilis').select('pot_number').eq('name', 'TEST Admin A').single()).data!.pot_number).toBe(42)
  })
  it('update with null potNumber leaves it unchanged', async () => {
    const pot = (await create('TEST Admin A')).json.potNumber
    await call(CHILI, { action: 'update', chiliId: await idOf('TEST Admin A'), cook: 'Pat', potNumber: null }, H)
    expect((await svc().from('chilis').select('pot_number').eq('name', 'TEST Admin A').single()).data!.pot_number).toBe(pot)
  })
  it('update changes fields and replaces allergens', async () => {
    await call(CHILI, { action: 'create', name: 'TEST Admin A', allergens: ['milk'] }, H)
    const id = await idOf('TEST Admin A')
    const r = await call(CHILI, { action: 'update', chiliId: id, cook: 'Pat', allergens: ['soy', 'eggs'] }, H)
    expect(r.status).toBe(200)
    const s = await call(STATE, {}, H)
    expect(s.json.chilis[0]).toMatchObject({ name: 'TEST Admin A', cook: 'Pat', allergenIds: ['eggs', 'soy'] })
  })
  it("update with '' clears cook", async () => {
    await call(CHILI, { action: 'create', name: 'TEST Admin A', cook: 'Pat' }, H)
    await call(CHILI, { action: 'update', chiliId: await idOf('TEST Admin A'), cook: '', potNumber: null }, H)
    expect((await call(STATE, {}, H)).json.chilis[0].cook).toBeNull()
  })
  it('update of an unknown chili is 400', async () => {
    const r = await call(CHILI, { action: 'update', chiliId: crypto.randomUUID(), cook: 'x' }, H)
    expect(r.status).toBe(400)
  })
  it('delete removes the chili', async () => {
    await create('TEST Admin A')
    const r = await call(CHILI, { action: 'delete', chiliId: await idOf('TEST Admin A') }, H)
    expect(r.status).toBe(200)
    expect((await call(STATE, {}, H)).json.chilis).toEqual([])
  })
  it('rejects a malformed body', async () => {
    expect((await call(CHILI, { action: 'nuke' }, H)).status).toBe(400)
  })
})

describe('admin event', () => {
  it('sets revealAt', async () => {
    const at = new Date(Date.now() + 3600_000).toISOString()
    expect((await call(EVENT, { status: 'voting', revealAt: at }, H)).status).toBe(200)
    const { event } = (await call(STATE, {}, H)).json
    expect(event.status).toBe('voting')
    expect(Date.parse(event.revealAt)).toBe(Date.parse(at))
  })
  it('revealNow makes get_results return rows', async () => {
    await create('TEST Admin A')
    await setEvent({ status: 'voting', reveal_at: new Date(Date.now() + 3600_000).toISOString() })
    expect((await svc().rpc('get_results')).data).toEqual([])
    expect((await call(EVENT, { revealNow: true }, H)).status).toBe(200)
    expect((await svc().rpc('get_results')).data).toHaveLength(1)
  })
})

describe('admin state', () => {
  it('has cook and ballotCount but no standings keys', async () => {
    await call(CHILI, { action: 'create', name: 'TEST Admin A', cook: 'Pat' }, H)
    const r = await call(STATE, {}, H)
    expect(r.json).toMatchObject({ ok: true, ballotCount: 0 })
    expect(r.json.chilis[0].cook).toBe('Pat')
    expect(JSON.stringify(r.json)).not.toMatch(/"(points|rank)"/)
  })
})
