'use client'

import Link from 'next/link'
import { fetchPastYear } from '@/lib/history'
import { useLive } from '@/lib/live'
import { fetchTags } from '@/lib/reference'
import { topTags } from '@/lib/tags'
import { EventBand } from './EventBand'
import { Results } from './Results'

export function HistoryYear({ year }: { year: string }) {
  const valid = /^\d{4}$/.test(year)
  const { data } = useLive([], () => (valid ? fetchPastYear(Number(year)) : Promise.resolve(null)), 86_400_000)
  const { data: tags } = useLive([], fetchTags, 86_400_000)
  return (
    <>
      <EventBand size="compact">Past cook-offs</EventBand>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-5 pb-6">
        {data && (
          <>
            <h1 className="text-[28px] font-semibold leading-tight">
              {data.event.name}, {data.event.year}
            </h1>
            <p>{data.event.ballotCount === 1 ? '1 ballot' : `${data.event.ballotCount} ballots`}</p>
            <Results rows={data.rows} topTags={(id) => topTags(data.tagCounts, id, tags ?? [])} />
          </>
        )}
        {data === null && <p className="py-6 text-[18px]">No cook-off on record for {year}.</p>}
        <Link href="/history" className="flex min-h-12 items-center text-enamel underline">
          All past cook-offs
        </Link>
      </main>
    </>
  )
}
