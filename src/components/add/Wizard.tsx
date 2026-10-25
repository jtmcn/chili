'use client'

import { useEffect, useReducer, useState } from 'react'
import { getDeviceId } from '@/lib/device-id'
import { postJson } from '@/lib/post-json'
import { fetchAllergens } from '@/lib/reference'
import type { RefItem } from '@/lib/types'
import { canAdvance, initialWizard, toPayload, wizardReducer } from '@/lib/wizard'
import { StepAllergens } from './StepAllergens'
import { StepDescription } from './StepDescription'
import { StepName } from './StepName'
import { StepReview } from './StepReview'
import { Success } from './Success'

const btn = 'min-h-12 rounded px-5 text-[18px] font-semibold disabled:opacity-60'

export function Wizard() {
  const [s, dispatch] = useReducer(wizardReducer, initialWizard)
  const [allergens, setAllergens] = useState<RefItem[]>([])
  const [pending, setPending] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [allergenError, setAllergenError] = useState<string | null>(null)
  const [pot, setPot] = useState<number | null>(null)

  const loadAllergens = () =>
    fetchAllergens().then(setAllergens, () => setAllergenError("Couldn't load the allergen list."))
  useEffect(() => {
    loadAllergens()
  }, [])

  const nav = (a: Parameters<typeof dispatch>[0]) => {
    setNameError(null)
    setSubmitError(null)
    dispatch(a)
  }

  if (pot !== null) return <Success potNumber={pot} />

  async function submit() {
    setPending(true)
    const r = await postJson<{ potNumber: number }>('/api/chili', toPayload(s, getDeviceId()))
    setPending(false)
    if (r.ok) return setPot(r.potNumber)
    // Only name problems are fixed on step 1; the rest stay on the review.
    if (r.error === 'name_taken' || r.error === 'invalid') {
      setNameError(r.message)
      dispatch({ type: 'goto', step: 1 })
    } else {
      setSubmitError(r.message)
    }
  }

  const skippable = s.step === 2 && !s.description
  const blocked = !canAdvance(s) || (s.step === 3 && allergens.length === 0)

  return (
    <>
      <div className="mb-6">
        <p>Step {s.step} of 4</p>
        <div className="mt-2 flex gap-1" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`h-2 flex-1 rounded ${n <= s.step ? 'bg-enamel' : 'bg-rule'}`} />
          ))}
        </div>
      </div>
      <div className="flex-1 pb-28">
        {s.step === 1 && (
          <StepName
            name={s.name}
            cook={s.cook}
            error={nameError}
            onChange={(field, value) => {
              setNameError(null)
              dispatch({ type: 'set', field, value })
            }}
          />
        )}
        {s.step === 2 && (
          <StepDescription value={s.description} onChange={(value) => dispatch({ type: 'set', field: 'description', value })} />
        )}
        {s.step === 3 && (
          <StepAllergens
            items={allergens}
            selected={s.allergens}
            none={s.noAllergens}
            onToggle={(id) => dispatch({ type: 'toggleAllergen', id })}
            onNone={() => dispatch({ type: 'toggleNone' })}
            error={allergenError}
            onRetry={() => {
              setAllergenError(null)
              loadAllergens()
            }}
          />
        )}
        {s.step === 4 && (
          <>
            <StepReview s={s} allergens={allergens} onEdit={(step) => nav({ type: 'goto', step })} />
            {submitError && (
              <p role="alert" className="mt-4 text-chili">
                {submitError}
              </p>
            )}
          </>
        )}
      </div>
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-rule bg-plate px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {s.step > 1 && (
          <button type="button" onClick={() => nav({ type: 'back' })} className={`${btn} border border-ink`}>
            Back
          </button>
        )}
        {s.step < 4 ? (
          <button
            type="button"
            disabled={blocked}
            onClick={() => nav({ type: 'next' })}
            className={`${btn} flex-1 bg-enamel text-plate`}
          >
            {skippable ? 'Skip' : 'Next'}
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={submit} className={`${btn} flex-1 bg-enamel text-plate`}>
            {pending ? 'Adding…' : 'Add my chili'}
          </button>
        )}
      </div>
    </>
  )
}
