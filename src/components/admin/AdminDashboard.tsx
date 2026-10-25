'use client'

import { useEffect, useState } from 'react'
import { useLive } from '@/lib/live'
import { fetchAllergens } from '@/lib/reference'
import type { EventState, PublicChili, RefItem } from '@/lib/types'
import { useAdminPost } from './AdminGate'
import { AdminChilis } from './AdminChilis'
import { AdminEvent } from './AdminEvent'
import { AdminQr } from './AdminQr'

interface State {
  event: EventState
  chilis: PublicChili[]
  ballotCount: number
}

export function AdminDashboard() {
  const post = useAdminPost()
  const { data, refresh } = useLive(['ballots', 'chilis', 'event'], async () => {
    const res = await post<State>('/api/admin/state', {})
    if (!res.ok) throw new Error(res.message)
    return res
  })
  const [allergens, setAllergens] = useState<RefItem[]>([])
  const [origin, setOrigin] = useState('')
  useEffect(() => {
    fetchAllergens().then(setAllergens, () => {})
    // window is client-only
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin)
  }, [])

  if (!data) return <p className="p-4">Loading…</p>
  const url = process.env.NEXT_PUBLIC_APP_URL || origin
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="event-name text-[28px] font-semibold">{data.event.name}</h1>
      <p className="print:hidden">{data.ballotCount} ballots in</p>
      <div className="print:hidden">
        <AdminEvent key={data.event.revealAt ?? 'none'} event={data.event} onChange={refresh} />
        <AdminChilis chilis={data.chilis} allergens={allergens} onChange={refresh} />
      </div>
      {url && <AdminQr url={url} />}
    </main>
  )
}
