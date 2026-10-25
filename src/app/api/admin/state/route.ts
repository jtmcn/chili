import { requireAdmin } from '@/lib/admin-auth'
import { fail, ok } from '@/lib/http'
import { serverClient } from '@/lib/supabase/server'
import type { EventState, PublicChili } from '@/lib/types'

export async function POST(req: Request): Promise<Response> {
  const denied = requireAdmin(req)
  if (denied) return denied

  const db = serverClient()
  const [ev, chilis, allergens, count] = await Promise.all([
    db.rpc('get_event'),
    db.from('chilis').select('id, pot_number, name, description, cook').order('pot_number'),
    db.from('chili_allergens').select('chili_id, allergen_id').order('allergen_id'),
    db.rpc('ballot_count'),
  ])
  const row = ev.data?.[0]
  if (ev.error || chilis.error || allergens.error || count.error || !row) return fail('server_error', 500)

  const event: EventState = {
    name: row.name,
    status: row.status as EventState['status'],
    revealAt: row.reveal_at,
    entriesOpen: row.entries_open,
    serverNow: row.server_now,
  }
  const out: PublicChili[] = chilis.data.map((c) => ({
    id: c.id,
    potNumber: c.pot_number,
    name: c.name,
    description: c.description,
    cook: c.cook,
    allergenIds: allergens.data.filter((a) => a.chili_id === c.id).map((a) => a.allergen_id),
  }))
  return ok({ event, chilis: out, ballotCount: count.data })
}
