'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Phase } from '@/lib/types'

// Sends the page to results at the Reveal; pass the Phase from useEventPhase().
export function useRevealRedirect(phase: Phase | undefined): void {
  const router = useRouter()
  useEffect(() => {
    if (phase === 'revealed') router.replace('/')
  }, [phase, router])
}
