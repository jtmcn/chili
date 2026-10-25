import { browserClient } from '@/lib/supabase/browser'
import type { RefItem, TagCount } from '@/lib/types'

export async function fetchTagCounts(): Promise<TagCount[]> {
  const { data, error } = await browserClient().rpc('get_tag_counts')
  if (error) throw error
  return data.map((r) => ({ chiliId: r.chili_id, tagId: r.tag_id, count: r.count }))
}

export function topTags(counts: TagCount[], chiliId: string, tags: RefItem[], n = 3) {
  const byId = new Map(tags.map((t) => [t.id, t]))
  return counts
    .filter((c) => c.chiliId === chiliId && c.count > 0 && byId.has(c.tagId))
    .map((c) => ({ id: c.tagId, label: byId.get(c.tagId)!.label, count: c.count, sort: byId.get(c.tagId)!.sort }))
    .sort((a, b) => b.count - a.count || a.sort - b.sort)
    .slice(0, n)
    .map(({ id, label, count }) => ({ id, label, count }))
}

const KEY = 'chili.myTags'

export function loadMyTags(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function saveMyTags(s: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]))
  } catch {}
}
