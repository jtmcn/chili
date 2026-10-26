'use client'

import { useEffect, useState } from 'react'

const KEY = 'chili.admin.guests'

export function AdminBallots({ ballotCount }: { ballotCount: number }) {
  const [guests, setGuests] = useState('')
  useEffect(() => {
    try {
      // localStorage is client-only
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuests(localStorage.getItem(KEY) ?? '')
    } catch {}
  }, [])

  function change(v: string) {
    setGuests(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {}
  }

  const expected = Number(guests)
  const over = expected > 0 && ballotCount > expected
  return (
    <div>
      <p>{ballotCount} ballots in</p>
      <label htmlFor="guests" className="mt-2 block">
        Guests expected
      </label>
      <input
        id="guests"
        type="number"
        inputMode="numeric"
        min={1}
        value={guests}
        onChange={(e) => change(e.target.value)}
        className="mt-1 min-h-12 w-24 rounded border border-rule px-3"
      />
      {over && (
        <p role="alert" className="mt-2">
          More ballots than guests. Someone may be voting more than once; consider closing voting early.
        </p>
      )}
    </div>
  )
}
