'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { currentPhase, fetchBallotCount, fetchEvent, offsetFrom, serverNow as serverNowMs } from '@/lib/event'
import { fetchChilis } from '@/lib/chilis'
import { useLive } from '@/lib/live'
import { fetchAllergens, fetchTags } from '@/lib/reference'
import { fetchResults } from '@/lib/results'
import { fetchTagCounts, topTags } from '@/lib/tags'
import { actionBar, primaryBtn, secondaryBtn } from './buttons'
import { ChiliList } from './ChiliList'
import { Countdown } from './Countdown'
import { EventBand } from './EventBand'
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
  const big = 'mt-2.5 font-bold leading-[1.1] tracking-[-0.01em]'
  return (
    <>
      <EventBand size="hero">
        <h1 className="text-[22px] font-semibold leading-tight">{event?.name ?? 'Chili Cook-Off'}</h1>
        {revealed && <p className={`${big} text-[40px]`}>Results</p>}
        {event && !revealed && (
          <p className={`${big} tabular-nums ${event.revealAt ? 'text-[40px]' : 'text-[28px]'}`}>
            {event.revealAt && <span className="sr-only">Results in </span>}
            <Countdown revealAt={event.revealAt} offsetMs={offsetMs} />
            {event.revealAt && (
              <span aria-hidden="true" className="block text-[18px] font-normal tracking-normal opacity-90">
                until results
              </span>
            )}
          </p>
        )}
        {ballots !== undefined && <p className="mt-1.5 opacity-90">{ballots === 1 ? '1 ballot in' : `${ballots} ballots in`}</p>}
      </EventBand>
      <main className="mx-auto w-full max-w-md flex-1 px-4">
        {revealed && chilis && <ResultsPanel chiliCount={chilis.length} tags={tags} tagCounts={tagCounts} />}
        {!revealed && chilis && <ChiliList chilis={chilis} allergens={allergens ?? []} entriesOpen={canAdd} tags={tags} tagCounts={tagCounts} />}
      </main>
      {(voting || canAdd) && (
        <div className={actionBar}>
          <div className="mx-auto grid max-w-md gap-2.5 px-4 pt-3 pb-4">
            {voting && (
              <Link href="/ballot" className={primaryBtn}>
                Vote for your top 3
              </Link>
            )}
            {canAdd && (
              <Link href="/add" className={voting ? secondaryBtn : primaryBtn}>
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
