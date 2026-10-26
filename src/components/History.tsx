'use client'

import Link from 'next/link'
import { fetchPastEvents } from '@/lib/history'
import { useLive } from '@/lib/live'
import { ordinal } from '@/lib/rank'
import { EventBand } from './EventBand'

export function History() {
  const { data: events } = useLive([], fetchPastEvents, 86_400_000)
  return (
    <>
      <EventBand size="compact">Past cook-offs</EventBand>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-5 pb-6">
        <h1 className="text-[28px] font-semibold leading-tight">Past cook-offs</h1>
        {events?.length === 0 && <p className="py-6">No past cook-offs yet.</p>}
        <ul className="divide-y divide-rule">
          {events?.map((e) => (
            <li key={e.year}>
              <Link href={`/history/${e.year}`} className="block min-h-12 py-4">
                <span className="block text-[22px] font-semibold leading-tight text-enamel underline">
                  {e.year} · {e.name}
                </span>
                <span className="block">
                  {e.chiliCount === 1 ? '1 chili' : `${e.chiliCount} chilis`} ·{' '}
                  {e.ballotCount === 1 ? '1 ballot' : `${e.ballotCount} ballots`}
                </span>
                <ol className="mt-1">
                  {e.podium.map((p) => (
                    <li key={`${p.rank}-${p.name}`}>
                      {ordinal(p.rank)}: {p.name}
                      {p.cook && ` (${p.cook})`}
                    </li>
                  ))}
                </ol>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/" className="flex min-h-12 items-center text-enamel underline">
          Back to this year
        </Link>
      </main>
    </>
  )
}
