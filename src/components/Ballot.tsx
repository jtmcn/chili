'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { clearPending, isComplete, loadPending, savePending, setPick, type Picks } from '@/lib/ballot'
import { fetchChilis } from '@/lib/chilis'
import { getDeviceId } from '@/lib/device-id'
import { currentPhase, fetchEvent, offsetFrom } from '@/lib/event'
import { useLive } from '@/lib/live'
import { postJson } from '@/lib/post-json'
import { useRevealRedirect } from '@/lib/use-reveal-redirect'
import { Countdown } from './Countdown'
import { PotNumber } from './PotNumber'

const RANKS = ['1st', '2nd', '3rd'] as const
const EMPTY: Picks = [null, null, null]

export function Ballot() {
  const { data: event } = useLive(['event'], fetchEvent)
  const { data: chilis } = useLive(['chilis'], fetchChilis)
  const offsetMs = useMemo(() => (event ? offsetFrom(event) : 0), [event])
  useRevealRedirect(event, offsetMs)
  const [picks, setPicks] = useState<Picks>(EMPTY)
  const [hasBallot, setHasBallot] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [closed, setClosed] = useState(false)

  async function submit(p: Picks) {
    const res = await postJson('/api/ballot', { deviceId: getDeviceId(), picks: p })
    if (res.ok) {
      clearPending()
      setHasBallot(true)
      setConfirmed(true)
      setError(undefined)
    } else {
      // a 4xx is final; only network/5xx keep the ballot for retry
      if (res.error !== 'network' && res.error !== 'server_error') clearPending()
      if (res.error === 'voting_closed') setClosed(true)
      else setError(res.message)
    }
  }

  useEffect(() => {
    // deferred so the setState calls aren't synchronous in the effect body
    void (async () => {
      await Promise.resolve()
      const pending = loadPending()
      if (pending) {
        setPicks(pending)
        await submit(pending)
        return
      }
      const r = await postJson<{ picks: Picks | null }>('/api/ballot/mine', { deviceId: getDeviceId() })
      if (r.ok && r.picks) {
        setPicks(r.picks)
        setHasBallot(true)
      }
    })()
  }, [])

  // drop picks for chilis that no longer exist
  const live = picks.map((id) => (!chilis || chilis.some((c) => c.id === id) ? id : null)) as Picks

  async function save() {
    setSaving(true)
    setConfirmed(false)
    savePending(live)
    await submit(live)
    setSaving(false)
  }

  const phase = event && currentPhase(event, Date.parse(event.serverNow))
  const open = phase === 'voting' && !!event?.revealAt && !closed
  const shell = 'mx-auto w-full max-w-md px-4'

  if (!event || !chilis) return <main className={`${shell} flex-1 pt-6`} />
  if (!open) {
    const isClosed = phase === 'revealed' || (closed && phase === 'voting')
    const time = event.revealAt
      ? new Date(event.revealAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : ''
    return (
      <main className={`${shell} flex-1 pt-6`}>
        <h1 className="text-[28px] font-semibold leading-tight">Your top 3</h1>
        <p className="mt-4">{isClosed ? `Voting is closed. Results at ${time}.` : 'Voting opens when the host starts it.'}</p>
        <Link href="/" className="flex min-h-12 items-center text-enamel underline">
          Back to all chilis
        </Link>
      </main>
    )
  }

  const name = (id: string | null) => chilis.find((c) => c.id === id)?.name ?? ''
  return (
    <>
      <main className={`${shell} flex-1 pt-6`}>
        <h1 className="text-[28px] font-semibold leading-tight">Your top 3</h1>
        <ul className="mt-4">
          {chilis.map((c) => (
            <li key={c.id} className="flex min-h-[72px] items-center gap-3 border-b border-rule py-2">
              <div className="w-[72px] shrink-0">
                <PotNumber n={c.potNumber} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[22px] font-semibold">{c.name}</p>
                <div className="mt-1 flex">
                  {RANKS.map((label, i) => {
                    const pressed = live[i] === c.id
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => {
                          setConfirmed(false)
                          setPicks(setPick(live, i as 0 | 1 | 2, c.id))
                        }}
                        className={`min-h-12 min-w-12 flex-1 border border-enamel first:rounded-l-md last:rounded-r-md ${
                          pressed ? 'bg-enamel text-plate' : 'bg-plate text-ink'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <div className="sticky bottom-0 border-t border-rule bg-plate pb-[env(safe-area-inset-bottom)]">
        <div className={`${shell} py-2`}>
          <ol className="text-[18px]">
            {RANKS.map((label, i) => (
              <li key={label} className="flex gap-2">
                <span className="w-10 font-semibold">{label}</span>
                <span className={live[i] ? '' : 'text-ink/60'}>{live[i] ? name(live[i]) : 'Not picked'}</span>
              </li>
            ))}
          </ol>
          {error && (
            <p role="alert" className="mt-1 text-chili">
              {error}
            </p>
          )}
          {confirmed && (
            <div className="mt-1">
              <p className="font-semibold">Picks saved</p>
              <p>
                Results in <Countdown revealAt={event.revealAt} offsetMs={offsetMs} />
              </p>
              {live.map((id, i) => (
                <p key={i}>{name(id)}</p>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!isComplete(live) || saving}
            className="mt-2 min-h-12 w-full rounded-md bg-enamel px-4 text-plate disabled:opacity-60"
          >
            {saving ? 'Saving…' : hasBallot ? 'Update my picks' : 'Save my picks'}
          </button>
        </div>
      </div>
    </>
  )
}
