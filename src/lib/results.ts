import { browserClient } from '@/lib/supabase/browser'
import type { ResultRow } from '@/lib/types'

export async function fetchResults(): Promise<ResultRow[]> {
  const { data, error } = await browserClient().rpc('get_results')
  if (error) throw error
  return data.map((r) => ({
    chiliId: r.chili_id,
    potNumber: r.pot_number,
    name: r.name,
    cook: r.cook,
    points: r.points,
    firsts: r.firsts,
    seconds: r.seconds,
    thirds: r.thirds,
    rank: r.rank,
  }))
}
