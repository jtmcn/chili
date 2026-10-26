import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { POST } from '@/app/api/ballot/route'
import { POST as MINE } from '@/app/api/ballot/mine/route'
import type { Database } from '@/lib/database.types'
import { call, resetDb, setEvent } from './helpers'

const svc = () => createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function seedChilis(n: number): Promise<string[]> {
  const c = svc()
  const ids: string[] = []
  for (let i = 0; i < n; i++) {
    const name = `TEST Ballot ${i}`
    await c.rpc('create_chili', { p_device_id: `test-dev-${i}`, p_name: name, p_cook: 'Pat', p_description: null as unknown as string, p_allergens: [] })
    const { data, error } = await c.from('chilis').select('id').eq('name', name).single()
    if (error) throw error
    ids.push(data.id)
  }
  return ids
}

const open = () => setEvent({ status: 'voting', reveal_at: new Date(Date.now() + 3600_000).toISOString() })

beforeEach(resetDb)

describe('POST /api/ballot', () => {
  it('accepts a valid ballot', async () => {
    const ids = await seedChilis(3)
    await open()
    const r = await call(POST, { deviceId: 'test-voter', picks: ids })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
  })
  it('rejects duplicate picks', async () => {
    const ids = await seedChilis(3)
    await open()
    expect((await call(POST, { deviceId: 'test-voter', picks: [ids[0], ids[0], ids[1]] })).status).toBe(400)
  })
  it('rejects two picks', async () => {
    const ids = await seedChilis(3)
    await open()
    expect((await call(POST, { deviceId: 'test-voter', picks: ids.slice(0, 2) })).status).toBe(400)
  })
  it('rejects a deleted chili as invalid', async () => {
    const ids = await seedChilis(3)
    await open()
    await svc().from('chilis').delete().eq('id', ids[1])
    const r = await call(POST, { deviceId: 'test-voter', picks: ids })
    expect(r.status).toBe(400)
    expect(r.json).toMatchObject({ error: 'invalid' })
  })
})

describe('POST /api/ballot/mine', () => {
  it('returns the latest picks', async () => {
    const ids = await seedChilis(3)
    await open()
    await call(POST, { deviceId: 'test-voter', picks: ids })
    const swapped = [ids[2], ids[1], ids[0]]
    await call(POST, { deviceId: 'test-voter', picks: swapped })
    const r = await call(MINE, { deviceId: 'test-voter' })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true, picks: swapped })
  })
  it('returns null for an unknown device', async () => {
    const r = await call(MINE, { deviceId: 'test-nobody' })
    expect(r.json).toEqual({ ok: true, picks: null })
  })
})
