'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchEvent, offsetFrom, serverNow } from '@/lib/event'
import { useLive } from '@/lib/live'
import type { EventState, Phase } from '@/lib/types'

const MAX_TIMEOUT = 2 ** 31 - 1

export interface EventPhase {
  phase: Phase
  votingOpen: boolean
  entriesOpen: boolean
}

// Mirrors the server's voting_open() and entries_ok().
export function phaseOf(e: EventState, nowMs: number): EventPhase {
  const revealAt = e.revealAt === null ? null : Date.parse(e.revealAt)
  const revealed = revealAt !== null && nowMs >= revealAt
  const phase = revealed ? 'revealed' : e.status
  return { phase, votingOpen: phase === 'voting' && revealAt !== null, entriesOpen: e.entriesOpen && !revealed }
}

type Loading = { phase: undefined; votingOpen: false; entriesOpen: false }

// The live Event and its Phase, re-rendered at the Reveal (server time) without waiting for a poll.
export function useEventPhase(): { event?: EventState; offsetMs: number } & (EventPhase | Loading) {
  const { data: event } = useLive(['event'], fetchEvent)
  // Recomputed on each event poll; between polls the phone clock is trusted.
  const offsetMs = useMemo(() => (event ? offsetFrom(event) : 0), [event])
  const revealAt = event?.revealAt ?? null
  // The revealAt whose timer has fired; keyed so a moved Reveal re-arms.
  const [reached, setReached] = useState<string | null>(null)
  useEffect(() => {
    if (!revealAt) return
    const ms = Math.max(0, Date.parse(revealAt) - serverNow(offsetMs))
    // Past the limit setTimeout fires at once; a later poll re-arms it.
    if (ms > MAX_TIMEOUT) return
    const t = setTimeout(() => setReached(revealAt), ms)
    return () => clearTimeout(t)
  }, [revealAt, offsetMs])

  if (!event) return { event, offsetMs, phase: undefined, votingOpen: false, entriesOpen: false }
  const snapshot = Date.parse(event.serverNow)
  const now = reached !== null && reached === revealAt ? Math.max(snapshot, Date.parse(reached)) : snapshot
  return { event, offsetMs, ...phaseOf(event, now) }
}
