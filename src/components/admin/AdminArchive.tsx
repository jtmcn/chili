'use client'

import Link from 'next/link'
import { useState } from 'react'
import { currentPhase } from '@/lib/event'
import type { EventState } from '@/lib/types'
import { useAdminPost } from './AdminGate'

const p = (n: number) => String(n).padStart(2, '0')
// Browser-local date: the server runs in UTC, which would shift an evening reveal to the next day.
const localDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

type Archived = { ok: true; year: number; archived: number | null; missingPhotos: string[] }

export function AdminArchive({
  event,
  archivedYear,
  onChange,
}: {
  event: EventState
  archivedYear: number | null
  onChange: () => void
}) {
  const post = useAdminPost()
  const [heldOn, setHeldOn] = useState(event.revealAt ? localDate(event.revealAt) : '')
  const [year, setYear] = useState(heldOn ? Number(heldOn.slice(0, 4)) : new Date().getFullYear())
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState(false)

  if (currentPhase(event, Date.parse(event.serverNow)) !== 'revealed') return null

  async function run(body: { year: number; heldOn: string }) {
    setPending(true)
    const res = await post<Archived>('/api/admin/archive', body)
    setPending(false)
    if (!res.ok) return setMsg(res.message)
    setMsg(res.missingPhotos.length ? `${res.missingPhotos.length} photo(s) didn't copy. Try again.` : '')
    onChange()
  }

  const btn = 'min-h-12 rounded border border-enamel px-4 font-semibold disabled:opacity-60'
  const input = 'min-h-12 rounded border border-rule px-3'
  return (
    <section className="mt-8">
      <h2 className="text-[22px] font-semibold">Archive</h2>
      {archivedYear === null ? (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run({ year, heldOn })
          }}
        >
          <label className="flex flex-col">
            Year
            <input type="number" required min={1000} max={9999} value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${input} w-28`} />
          </label>
          <label className="flex flex-col">
            Date
            <input type="date" required value={heldOn} onChange={(e) => setHeldOn(e.target.value)} className={input} />
          </label>
          <button type="submit" disabled={pending} className={`${btn} bg-enamel text-plate`}>
            {pending ? 'Archiving…' : 'Archive this year'}
          </button>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p>Archived as {archivedYear}</p>
          <Link href={`/history/${archivedYear}`} className="flex min-h-12 items-center text-enamel underline">
            View history
          </Link>
          {/* same-year re-run only copies missing photos */}
          <button type="button" disabled={pending} className={btn} onClick={() => run({ year: archivedYear, heldOn })}>
            {pending ? 'Checking…' : 'Re-check photos'}
          </button>
        </div>
      )}
      {msg && (
        <p role="alert" className="mt-2 text-chili">
          {msg}
        </p>
      )}
    </section>
  )
}
