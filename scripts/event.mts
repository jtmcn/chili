// Event housekeeping against whichever Supabase project the env points at.
//   npm run event -- check                       grants + read-path smoke test
//   npm run event -- reset [--name "..."] --yes  wipe entries, votes, photos; back to Setup
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'chili-photos'
const READS = ['get_event', 'ballot_count', 'get_chilis', 'get_tag_counts', 'get_results', 'voting_open'] as const

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { yes: { type: 'boolean', default: false }, name: { type: 'string' } },
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
  // one folder per chili id
  for (const dir of top.data) {
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
  if (photos.length) {
    const { error } = await db.storage.from(BUCKET).remove(photos)
    if (error) throw error
  }
  const { error } = await db.rpc('reset_event', values.name ? { p_name: values.name } : {})
  if (error) throw error
  console.log('✓ Reset: event is in Setup with entries closed and no reveal time.')
  return check()
}

const commands: Record<string, () => Promise<boolean>> = { check, reset }
const run = commands[positionals[0] ?? '']
if (!run) {
  console.error('Usage: npm run event -- check | reset [--name "..."] --yes')
  process.exit(1)
}
process.exit((await run()) ? 0 : 1)
