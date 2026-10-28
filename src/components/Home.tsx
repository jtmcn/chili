'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchBallotCount } from '@/lib/event'
import { fetchChilis } from '@/lib/chilis'
import { useLive } from '@/lib/live'
import { useEventPhase } from '@/lib/phase'
import { fetchAllergens, fetchTags } from '@/lib/reference'
import { fetchResults } from '@/lib/results'
import { fetchTagCounts, topTags } from '@/lib/tags'
import { actionBar, primaryBtn, secondaryBtn } from './buttons'
import { ChiliList } from './ChiliList'
import { Countdown } from './Countdown'
import { EventBand } from './EventBand'
import { MyChilis } from './MyChilis'
import { Results } from './Results'
import type { RefItem, TagCount } from '@/lib/types'

// Fetched client-side so `/` stays static and the build never calls Supabase.
export function Home() {
  const { event, offsetMs, phase, votingOpen: voting, entriesOpen: canAdd } = useEventPhase()
  const { data: chilis } = useLive(['chilis'], fetchChilis)
  const { data: allergens } = useLive([], fetchAllergens, 86_400_000)
  const { data: tags } = useLive([], fetchTags, 86_400_000)
  const { data: tagCounts } = useLive(['chili_tags'], fetchTagCounts)
  const { data: ballots } = useLive(['ballots'], fetchBallotCount)
  const revealed = phase === 'revealed'
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
        {event && !revealed && <MyChilis />}
        {!revealed && chilis && <ChiliList chilis={chilis} allergens={allergens ?? []} entriesOpen={canAdd} tags={tags} tagCounts={tagCounts} />}
        <Link href="/history" className="flex min-h-12 items-center text-enamel underline">
          Past cook-offs
        </Link>
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
