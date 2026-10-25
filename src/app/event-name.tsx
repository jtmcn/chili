'use client'

import { useEffect, useState } from 'react'
import { fetchEvent } from '@/lib/event'

// Fetched client-side so `/` stays static and the build never calls Supabase.
export function EventName() {
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    fetchEvent().then((e) => setName(e.name), () => setName(null))
  }, [])
  return <h1 className="text-3xl font-semibold">{name ?? 'Chili Cook-Off'}</h1>
}
