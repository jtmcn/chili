'use client'

import Link from 'next/link'
import { currentPhase, fetchEvent } from '@/lib/event'
import { fetchChilis } from '@/lib/chilis'
import { useLive } from '@/lib/live'
import { fetchAllergens } from '@/lib/reference'
import { ChiliList } from './ChiliList'

// Fetched client-side so `/` stays static and the build never calls Supabase.
export function Home() {
  const { data: event } = useLive(['event'], fetchEvent)
  const { data: chilis } = useLive(['chilis'], fetchChilis)
  const { data: allergens } = useLive([], fetchAllergens, 86_400_000)
  const canAdd = !!event?.entriesOpen && currentPhase(event, Date.parse(event.serverNow)) !== 'revealed'
  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6">
        <h1 className="text-[28px] font-semibold leading-tight sm:text-[40px]">{event?.name ?? 'Chili Cook-Off'}</h1>
        <div className="mt-4">
          {chilis && <ChiliList chilis={chilis} allergens={allergens ?? []} entriesOpen={canAdd} />}
        </div>
      </main>
      {canAdd && (
        <div className="sticky bottom-0 border-t border-rule bg-plate pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-md px-4">
            <Link href="/add" className="flex min-h-12 items-center text-enamel underline">
              Bringing a chili? Add it
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
