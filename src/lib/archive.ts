import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { PHOTO_BUCKET } from '@/lib/photo'

type Db = SupabaseClient<Database>

async function exists(db: Db, path: string): Promise<boolean> {
  const i = path.lastIndexOf('/')
  const { data, error } = await db.storage.from(PHOTO_BUCKET).list(path.slice(0, i), { search: path.slice(i + 1) })
  if (error) throw error
  return data.some((o) => o.name === path.slice(i + 1))
}

// Safe to re-run: skips the DB step once archived under `year` and copies only missing photos.
export async function archiveEvent(
  db: Db,
  year: number,
  heldOn: string,
): Promise<{ archived: number | null; missingPhotos: string[] }> {
  const ev = await db.from('event').select('archived_year').eq('id', 1).single()
  if (ev.error) throw ev.error
  let archived: number | null = null
  if (ev.data.archived_year !== year) {
    const { data, error } = await db.rpc('archive_event', { p_year: year, p_held_on: heldOn })
    if (error) throw error
    archived = data
  }

  const rows = await db.from('past_chilis').select('photo_path').eq('year', year).not('photo_path', 'is', null)
  if (rows.error) throw rows.error
  const missingPhotos: string[] = []
  for (const { photo_path } of rows.data) {
    const to = photo_path!
    if (await exists(db, to)) continue
    // archived path is "<year>/<live path>"
    const { error } = await db.storage.from(PHOTO_BUCKET).copy(to.slice(String(year).length + 1), to)
    if (error) missingPhotos.push(to)
  }
  return { archived, missingPhotos }
}
