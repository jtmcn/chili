/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error(`Refusing to touch non-local DB: ${url}`)
  return createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function resetDb(): Promise<void> {
  const c = db()
  // `not is null` style filters: delete requires a filter
  for (const [t, col] of [['ballots', 'device_id'], ['chili_tags', 'device_id'], ['chili_allergens', 'chili_id'], ['chilis', 'id']] as const) {
    const { error } = await c.from(t).delete().not(col, 'is', null)
    if (error) throw error
  }
  const past = await c.from('past_events').delete().gte('year', 0)
  if (past.error) throw past.error
  const { error } = await c.from('event')
    .update({ status: 'setup', reveal_at: null, entries_open: true, archived_year: null })
    .eq('id', 1)
  if (error) throw error
}

export async function setEvent(p: Partial<{ status: string; reveal_at: string | null; entries_open: boolean }>): Promise<void> {
  const { error } = await db().from('event').update(p).eq('id', 1)
  if (error) throw error
}

export async function call(
  handler: (req: Request) => Promise<Response>,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: any }> {
  const res = await handler(new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }))
  return { status: res.status, json: await res.json() }
}
