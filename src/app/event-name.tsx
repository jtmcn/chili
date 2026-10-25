'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { currentPhase, fetchEvent } from '@/lib/event'
import type { EventState } from '@/lib/types'

// Fetched client-side so `/` stays static and the build never calls Supabase.
export function EventName() {
  const [event, setEvent] = useState<EventState | null>(null)
  useEffect(() => {
    fetchEvent().then(setEvent, () => setEvent(null))
  }, [])
  const canAdd = event?.entriesOpen && currentPhase(event, Date.parse(event.serverNow)) !== 'revealed'
  return (
    <>
      <h1 className="text-[28px] font-semibold leading-tight sm:text-[40px]">{event?.name ?? 'Chili Cook-Off'}</h1>
      {canAdd && (
        <Link href="/add" className="mt-4 flex min-h-12 items-center text-enamel underline">
          Bringing a chili? Add it
        </Link>
      )}
    </>
  )
}
