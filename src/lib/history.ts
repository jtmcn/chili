import { browserClient } from '@/lib/supabase/browser'
import type { ResultRow, TagCount } from '@/lib/types'

export interface PastEvent {
  year: number
  name: string
  heldOn: string
  ballotCount: number
  chiliCount: number
  podium: { rank: number; name: string; cook: string | null }[]
}

type ChiliRow = { year: number; pot_number: number; name: string; cook: string | null; rank: number }

function toEvent(e: { year: number; name: string; held_on: string; ballot_count: number }, chilis: ChiliRow[]): PastEvent {
  const mine = chilis.filter((c) => c.year === e.year).sort((a, b) => a.rank - b.rank || a.pot_number - b.pot_number)
  return {
    year: e.year,
    name: e.name,
    heldOn: e.held_on,
    ballotCount: e.ballot_count,
    chiliCount: mine.length,
    podium: mine.filter((c) => c.rank <= 3).map(({ rank, name, cook }) => ({ rank, name, cook })),
  }
}

export async function fetchPastEvents(): Promise<PastEvent[]> {
  const db = browserClient()
  const [events, chilis] = await Promise.all([
    db.from('past_events').select('year,name,held_on,ballot_count').order('year', { ascending: false }),
    db.from('past_chilis').select('year,pot_number,name,cook,rank'),
  ])
  if (events.error) throw events.error
  if (chilis.error) throw chilis.error
  return events.data.map((e) => toEvent(e, chilis.data))
}

export async function fetchPastYear(
  year: number,
): Promise<{ event: PastEvent; rows: ResultRow[]; tagCounts: TagCount[] } | null> {
  const db = browserClient()
  const [event, chilis] = await Promise.all([
    db.from('past_events').select('year,name,held_on,ballot_count').eq('year', year).maybeSingle(),
    db.from('past_chilis').select('*').eq('year', year).order('rank').order('pot_number'),
  ])
  if (event.error) throw event.error
  if (chilis.error) throw chilis.error
  if (!event.data) return null
  const id = (pot: number) => `${year}-${pot}`
  return {
    event: toEvent(event.data, chilis.data),
    rows: chilis.data.map((c) => ({
      chiliId: id(c.pot_number),
      potNumber: c.pot_number,
      name: c.name,
      cook: c.cook,
      points: c.points,
      firsts: c.firsts,
      seconds: c.seconds,
      thirds: c.thirds,
      rank: c.rank,
      photoPath: c.photo_path,
    })),
    tagCounts: chilis.data.flatMap((c) =>
      Object.entries(c.tag_counts as Record<string, number>).map(([tagId, count]) => ({ chiliId: id(c.pot_number), tagId, count })),
    ),
  }
}
