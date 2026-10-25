import { browserClient } from '@/lib/supabase/browser'
import type { RefItem } from '@/lib/types'

async function fetchRef(table: 'allergens' | 'tags'): Promise<RefItem[]> {
  const { data, error } = await browserClient()
    .from(table)
    .select('id,label,sort')
    .order('sort')
  if (error) throw error
  return data
}

export const fetchAllergens = () => fetchRef('allergens')
export const fetchTags = () => fetchRef('tags')
