'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeLive, type LiveTopic } from '@/lib/live-channel'

export { subscribeLive, type LiveTopic }

export function useLive<T>(
  topics: LiveTopic[],
  fetcher: () => Promise<T>,
  intervalMs = 10_000,
): { data: T | undefined; error: unknown; refresh: () => void } {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>()
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })
  const seq = useRef(0)
  const applied = useRef(0)
  const key = topics.join(',')

  const refresh = useCallback(() => {
    const id = ++seq.current
    fetcherRef.current().then(
      (d) => {
        if (id < applied.current) return // older than what's shown
        applied.current = id
        setData(d)
        setError(undefined)
      },
      (e) => {
        if (id >= applied.current) setError(e)
      },
    )
  }, [])

  useEffect(() => {
    const wanted = key.split(',')
    refresh()
    const unsub = subscribeLive((t) => {
      if (wanted.includes(t)) refresh()
    })
    const timer = setInterval(refresh, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      unsub()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [key, intervalMs, refresh])

  return { data, error, refresh }
}
