import { browserClient } from '@/lib/supabase/browser'
import type { PublicChili } from '@/lib/types'

export async function fetchChilis(): Promise<PublicChili[]> {
  const { data, error } = await browserClient().rpc('get_chilis')
  if (error) throw error
  return data
    .map((r) => ({
      id: r.id,
      potNumber: r.pot_number,
      name: r.name,
      description: r.description,
      cook: r.cook,
      allergenIds: r.allergen_ids,
      photoPath: r.photo_path,
    }))
    .sort((a, b) => a.potNumber - b.potNumber)
}

export async function fetchChili(id: string): Promise<PublicChili | null> {
  return (await fetchChilis()).find((c) => c.id === id) ?? null
}
