'use client'

import { useState } from 'react'
import type { EventState } from '@/lib/types'
import { useAdminPost } from './AdminGate'

// datetime-local ("YYYY-MM-DDTHH:mm", local) <-> ISO
const toLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function AdminEvent({ event, onChange }: { event: EventState; onChange: () => void }) {
  const post = useAdminPost()
  const [reveal, setReveal] = useState(toLocal(event.revealAt))
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState(false)

  async function send(body: Record<string, unknown>) {
    setPending(true)
    const res = await post('/api/admin/event', body)
    setPending(false)
    setMsg(res.ok ? 'Saved' : res.message)
    if (res.ok) onChange()
  }

  const btn = 'min-h-12 rounded border border-enamel px-4 font-semibold disabled:opacity-60'
  const on = 'bg-enamel text-plate'

  return (
    <section className="mt-8">
      <h2 className="text-[22px] font-semibold">Event</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span>Entries</span>
        <button
          type="button"
          aria-pressed={event.entriesOpen}
          disabled={pending}
          className={`${btn} ${event.entriesOpen ? on : ''}`}
          onClick={() => send({ entriesOpen: !event.entriesOpen })}
        >
          {event.entriesOpen ? 'Close entries' : 'Open entries'}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span>Status</span>
        {(['setup', 'voting'] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={event.status === s}
            disabled={pending}
            className={`${btn} ${event.status === s ? on : ''}`}
            onClick={() => send({ status: s })}
          >
            {s === 'setup' ? 'Setup' : 'Voting'}
          </button>
        ))}
      </div>
      {event.status === 'voting' && !event.revealAt && (
        <p role="alert" className="mt-2">
          Voting has no reveal time, so tasters can&apos;t vote yet. Set a reveal time.
        </p>
      )}
      <div className="mt-4">
        <label htmlFor="reveal-at" className="block">
          Reveal time
        </label>
        <input
          id="reveal-at"
          type="datetime-local"
          value={reveal}
          onChange={(e) => setReveal(e.target.value)}
          className="mt-1 min-h-12 rounded border border-rule px-3"
        />
        <button
          type="button"
          disabled={pending}
          className={`${btn} ml-2`}
          onClick={() => send({ revealAt: reveal ? new Date(reveal).toISOString() : null })}
        >
          Set reveal time
        </button>
      </div>
      <button
        type="button"
        disabled={pending}
        className="mt-4 min-h-12 rounded bg-chili px-4 font-semibold text-plate disabled:opacity-60"
        onClick={() => confirm('Close voting and show results now?') && send({ revealNow: true })}
      >
        Reveal now
      </button>
      <p role="status" className="mt-2 min-h-6">
        {msg}
      </p>
    </section>
  )
}
