'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { currentPhase, serverNow } from '@/lib/event'
import type { EventState } from '@/lib/types'

const MAX_TIMEOUT = 2 ** 31 - 1

// Sends the page to results at reveal, whether it was already past or arrives while open.
export function useRevealRedirect(event: EventState | undefined, offsetMs: number): void {
  const router = useRouter()
  const revealAt = event?.revealAt
  const revealed = !!event && currentPhase(event, Date.parse(event.serverNow)) === 'revealed'
  useEffect(() => {
    if (revealed) {
      router.replace('/')
      return
    }
    if (!revealAt) return
    const t = setTimeout(() => router.replace('/'), Math.min(MAX_TIMEOUT, Math.max(0, Date.parse(revealAt) - serverNow(offsetMs))))
    return () => clearTimeout(t)
  }, [revealed, revealAt, offsetMs, router])
}
