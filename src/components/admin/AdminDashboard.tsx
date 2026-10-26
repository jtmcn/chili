'use client'

import { useEffect, useState } from 'react'
import { useLive } from '@/lib/live'
import { fetchAllergens } from '@/lib/reference'
import type { EventState, PublicChili, RefItem } from '@/lib/types'
import { useAdminPost } from './AdminGate'
import { AdminArchive } from './AdminArchive'
import { AdminBallots } from './AdminBallots'
import { AdminChilis } from './AdminChilis'
import { AdminEvent } from './AdminEvent'
import { AdminQr } from './AdminQr'

interface State {
  event: EventState
  chilis: PublicChili[]
  ballotCount: number
  archivedYear: number | null
}

export function AdminDashboard() {
  const post = useAdminPost()
  const { data, error, refresh } = useLive(['ballots', 'chilis', 'event'], async () => {
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

  if (!data) {
    return (
      <p role={error ? 'alert' : undefined} className="p-4">
        {error instanceof Error ? error.message : error ? 'Could not load admin data.' : 'Loading…'}
      </p>
    )
  }
  const url = process.env.NEXT_PUBLIC_APP_URL || origin
  return (
    <main className="mx-auto w-full max-w-md p-4 print:max-w-none print:p-0">
      <h1 className="event-name text-[28px] font-semibold">{data.event.name}</h1>
      <div className="print:hidden">
        <AdminBallots ballotCount={data.ballotCount} />
        <AdminEvent key={data.event.revealAt ?? 'none'} event={data.event} onChange={refresh} />
        <AdminArchive key={data.event.revealAt ?? 'none'} event={data.event} archivedYear={data.archivedYear} onChange={refresh} />
        <AdminChilis chilis={data.chilis} allergens={allergens} onChange={refresh} />
      </div>
      {url && <AdminQr url={url} />}
    </main>
  )
}
