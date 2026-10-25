import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { POST } from '@/app/api/tag/route'
import type { Database } from '@/lib/database.types'
import { call, resetDb, setEvent } from './helpers'

async function seedChili(): Promise<string> {
  const c = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  await c.rpc('create_chili', { p_device_id: 'test-dev-1', p_name: 'TEST Tagged', p_cook: null as unknown as string, p_description: null as unknown as string, p_allergens: [] })
  const { data, error } = await c.from('chilis').select('id').eq('name', 'TEST Tagged').single()
  if (error) throw error
  return data.id
}

beforeEach(resetDb)

describe('POST /api/tag', () => {
  it('sets a tag', async () => {
    const chiliId = await seedChili()
    await setEvent({ status: 'voting', reveal_at: new Date(Date.now() + 3600_000).toISOString() })
    const r = await call(POST, { chiliId, tagId: 'spicy', deviceId: 'test-dev-1', on: true })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
  })
  it('rejects an unknown tag', async () => {
    const chiliId = await seedChili()
    expect((await call(POST, { chiliId, tagId: 'nope', deviceId: 'test-dev-1', on: true })).status).toBe(400)
  })
})
