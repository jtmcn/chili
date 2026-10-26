// Event housekeeping against whichever Supabase project the env points at.
//   npm run event -- check                                       grants + read-path smoke test
//   archiving is done from /admin (Archive this year)
//   npm run event -- reset [--name "..."] [--force] --yes        wipe entries, votes, live photos; back to Setup
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'chili-photos'
const READS = ['get_event', 'ballot_count', 'get_chilis', 'get_tag_counts', 'get_results', 'voting_open'] as const

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    yes: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    name: { type: 'string' },
  },
})
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.production.local).')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

async function check(): Promise<boolean> {
  let ok = true
  const gaps = await db.rpc('grant_gaps')
  if (gaps.error) {
    console.error(`✗ grant_gaps: ${gaps.error.message} (migrations not pushed?)`)
    ok = false
  } else {
    for (const g of gaps.data as { kind: string; name: string }[]) {
      console.error(`✗ service_role can't use ${g.kind} ${g.name}`)
      ok = false
    }
  }
  for (const fn of READS) {
    const { error } = await db.rpc(fn)
    if (error) {
      console.error(`✗ ${fn}: ${error.message}`)
      ok = false
    }
  }
  console.log(ok ? `✓ ${url} is ready` : `✗ ${url} has problems; fix before the event`)
  return ok
}

async function count(table: string): Promise<number> {
  const { count: n, error } = await db.from(table).select('*', { count: 'exact', head: true })
  if (error) throw error
  return n ?? 0
}

async function photoPaths(): Promise<string[]> {
  const top = await db.storage.from(BUCKET).list('', { limit: 1000 })
  if (top.error) throw top.error
  const paths: string[] = []
  // one folder per chili id; year folders hold archived copies
  for (const dir of top.data.filter((d) => !/^\d{4}$/.test(d.name))) {
    const inner = await db.storage.from(BUCKET).list(dir.name, { limit: 1000 })
    if (inner.error) throw inner.error
    paths.push(...inner.data.map((o) => `${dir.name}/${o.name}`))
  }
  return paths
}

async function reset(): Promise<boolean> {
  const [chilis, ballots, tags, photos] = await Promise.all([
    count('chilis'), count('ballots'), count('chili_tags'), photoPaths(),
  ])
  console.log(`${url}: ${chilis} chilis, ${ballots} ballots, ${tags} tags, ${photos.length} photos`)
  if (!values.yes) {
    console.log('Nothing changed. Re-run with --yes to wipe all of it.')
    return false
  }
  const missing = values.force ? [] : await missingArchivedPhotos()
  if (missing.length) {
    console.error(`✗ ${missing.length} archived photo(s) missing; re-check photos under Archive in /admin first (or pass --force).`)
    return false
  }
  const { error } = await db.rpc('reset_event', { ...(values.name && { p_name: values.name }), p_force: values.force })
  if (error?.message === 'not_archived') {
    console.error('✗ Archive first from /admin (or pass --force to discard).')
    return false
  }
  if (error) throw error
  // after the DB reset, so a refused reset keeps its photos
  if (photos.length) {
    const removed = await db.storage.from(BUCKET).remove(photos)
    if (removed.error) throw removed.error
  }
  console.log('✓ Reset: event is in Setup with entries closed and no reveal time.')
  return check()
}

async function exists(path: string): Promise<boolean> {
  const i = path.lastIndexOf('/')
  const { data, error } = await db.storage.from(BUCKET).list(path.slice(0, i), { search: path.slice(i + 1) })
  if (error) throw error
  return data.some((o) => o.name === path.slice(i + 1))
}

// Archived photo paths for the current event's year that have no stored copy.
async function missingArchivedPhotos(): Promise<string[]> {
  const ev = await db.from('event').select('archived_year').eq('id', 1).single()
  if (ev.error) throw ev.error
  if (ev.data.archived_year === null) return []
  const rows = await db.from('past_chilis').select('photo_path').eq('year', ev.data.archived_year).not('photo_path', 'is', null)
  if (rows.error) throw rows.error
  const missing: string[] = []
  for (const { photo_path: p } of rows.data) if (!(await exists(p!))) missing.push(p!)
  return missing
}

const commands: Record<string, () => Promise<boolean>> = { check, reset }
const run = commands[positionals[0] ?? '']
if (!run) {
  console.error('Usage: npm run event -- check | reset [--name "..."] [--force] --yes')
  process.exit(1)
}
process.exit((await run()) ? 0 : 1)
