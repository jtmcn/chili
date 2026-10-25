'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { currentPhase, fetchBallotCount, fetchEvent, offsetFrom, serverNow as serverNowMs } from '@/lib/event'
import { fetchChilis } from '@/lib/chilis'
import { useLive } from '@/lib/live'
import { fetchAllergens, fetchTags } from '@/lib/reference'
import { fetchResults } from '@/lib/results'
import { fetchTagCounts, topTags } from '@/lib/tags'
import { ChiliList } from './ChiliList'
import { Countdown } from './Countdown'
import { Results } from './Results'
import type { RefItem, TagCount } from '@/lib/types'

// Fetched client-side so `/` stays static and the build never calls Supabase.
export function Home() {
  const { data: event } = useLive(['event'], fetchEvent)
  const { data: chilis } = useLive(['chilis'], fetchChilis)
  const { data: allergens } = useLive([], fetchAllergens, 86_400_000)
  const { data: tags } = useLive([], fetchTags, 86_400_000)
  const { data: tagCounts } = useLive(['chili_tags'], fetchTagCounts)
  const { data: ballots } = useLive(['ballots'], fetchBallotCount)
  // Offset is recomputed on each event poll; between polls the countdown ignores phone-clock changes.
  const offsetMs = useMemo(() => (event ? offsetFrom(event) : 0), [event])
  const [nowMs, setNowMs] = useState<number>()
  const revealAt = event?.revealAt
  // Fires at revealAt (server time); re-armed when revealAt or the offset changes.
  useEffect(() => {
    if (!revealAt) return
    const t = setTimeout(() => setNowMs(Date.now()), Math.max(0, Date.parse(revealAt) - serverNowMs(offsetMs)))
    return () => clearTimeout(t)
  }, [revealAt, offsetMs])
  const phase = event ? currentPhase(event, nowMs === undefined ? Date.parse(event.serverNow) : serverNowMs(offsetMs, nowMs)) : undefined
  const revealed = phase === 'revealed'
  const voting = !!event?.revealAt && phase === 'voting'
  const canAdd = !!event?.entriesOpen && !revealed
  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6">
        <h1 className="text-[28px] font-semibold leading-tight sm:text-[40px]">{event?.name ?? 'Chili Cook-Off'}</h1>
        {event && !revealed && (
          <p className="mt-1">
            {event.revealAt && 'Results in '}
            <Countdown revealAt={event.revealAt} offsetMs={offsetMs} />
          </p>
        )}
        {ballots !== undefined && <p>{ballots === 1 ? '1 ballot in' : `${ballots} ballots in`}</p>}
        <div className="mt-4">
          {revealed && chilis && <ResultsPanel chiliCount={chilis.length} tags={tags} tagCounts={tagCounts} />}
          {!revealed && chilis && <ChiliList chilis={chilis} allergens={allergens ?? []} entriesOpen={canAdd} tags={tags} tagCounts={tagCounts} />}
        </div>
      </main>
      {(voting || canAdd) && (
        <div className="sticky bottom-0 border-t border-rule bg-plate pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-md px-4">
            {voting && (
              <Link href="/ballot" className="my-2 flex min-h-12 items-center justify-center rounded bg-enamel font-semibold text-plate">
                Vote for your top 3
              </Link>
            )}
            {canAdd && (
              <Link href="/add" className="flex min-h-12 items-center text-enamel underline">
                Bringing a chili? Add it
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const RETRY_MS = 1000
const MAX_RETRIES = 10

function ResultsPanel({ chiliCount, tags, tagCounts }: { chiliCount: number; tags?: RefItem[]; tagCounts?: TagCount[] }) {
  const { data: rows, refresh } = useLive(['event'], fetchResults)
  const [tries, setTries] = useState(0)
  const empty = rows !== undefined && rows.length === 0 && chiliCount > 0
  // get_results can lag the clock slightly; retry for up to 10 s.
  useEffect(() => {
    if (!empty || tries >= MAX_RETRIES) return
    const t = setTimeout(() => {
      setTries((n) => n + 1)
      refresh()
    }, RETRY_MS)
    return () => clearTimeout(t)
  }, [empty, tries, refresh])
  if (!rows || empty) return <p className="py-6">Counting the votes…</p>
  return <Results rows={rows} topTags={(id) => topTags(tagCounts ?? [], id, tags ?? [])} />
}
