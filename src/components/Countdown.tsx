'use client'

import { useEffect, useState } from 'react'
import { serverNow } from '@/lib/event'

export function format(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function Countdown({ revealAt, offsetMs }: { revealAt: string | null; offsetMs: number }) {
  const [now, setNow] = useState(() => serverNow(offsetMs))
  useEffect(() => {
    const tick = () => setNow(serverNow(offsetMs))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [offsetMs])

  if (!revealAt) return <span>Reveal time not set</span>
  const left = Math.ceil((Date.parse(revealAt) - now) / 1000)
  if (left <= 0) return <span>Revealing…</span>
  return <span>{format(left)}</span>
}
