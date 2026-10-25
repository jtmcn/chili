'use client'

import { useState } from 'react'
import type { PublicChili, RefItem } from '@/lib/types'
import { PotNumber } from '@/components/PotNumber'
import { photoUrl } from '@/lib/photo'
import { useAdminPost } from './AdminGate'

type Draft = { name: string; cook: string; potNumber: string; description: string; allergens: string[] }
const blank: Draft = { name: '', cook: '', potNumber: '', description: '', allergens: [] }
const fromChili = (c: PublicChili): Draft => ({
  name: c.name,
  cook: c.cook ?? '',
  potNumber: String(c.potNumber),
  description: c.description ?? '',
  allergens: c.allergenIds,
})

const input = 'min-h-12 w-full rounded border border-rule px-3'

function Fields({ d, set, allergens }: { d: Draft; set: (d: Draft) => void; allergens: RefItem[] }) {
  const f = (k: keyof Draft, label: string, type = 'text') => (
    <label className="mt-2 block">
      {label}
      <input
        type={type}
        value={d[k] as string}
        onChange={(e) => set({ ...d, [k]: e.target.value })}
        className={input}
      />
    </label>
  )
  return (
    <>
      {f('name', 'Chili name')}
      {f('cook', 'Cook')}
      {f('potNumber', 'Pot number', 'number')}
      {f('description', 'Description')}
      <fieldset className="mt-2">
        <legend>Allergens</legend>
        <div className="flex flex-wrap gap-2">
          {allergens.map((a) => {
            const on = d.allergens.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                className={`min-h-12 rounded border border-rule px-3 ${on ? 'bg-enamel text-plate' : ''}`}
                onClick={() =>
                  set({ ...d, allergens: on ? d.allergens.filter((x) => x !== a.id) : [...d.allergens, a.id] })
                }
              >
                {a.label}
              </button>
            )
          })}
        </div>
      </fieldset>
    </>
  )
}

export function AdminChilis({
  chilis,
  allergens,
  onChange,
}: {
  chilis: PublicChili[]
  allergens: RefItem[]
  onChange: () => void
}) {
  const post = useAdminPost()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(blank)
  const [adding, setAdding] = useState<Draft>(blank)
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState(false)

  async function run(body: Record<string, unknown>) {
    setPending(true)
    const res = await post('/api/admin/chili', body)
    setPending(false)
    setMsg(res.ok ? '' : res.message)
    if (res.ok) onChange()
    return res.ok
  }

  const payload = (d: Draft) => ({
    name: d.name,
    cook: d.cook,
    description: d.description,
    potNumber: d.potNumber ? Number(d.potNumber) : null,
    allergens: d.allergens,
  })

  return (
    <section className="mt-8">
      <h2 className="text-[22px] font-semibold">Chilis</h2>
      <p role="alert" className="min-h-6 text-chili">
        {msg}
      </p>
      <ul>
        {chilis.map((c) => (
          <li key={c.id} className="border-t border-rule py-3">
            {editing === c.id ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (await run({ action: 'update', chiliId: c.id, ...payload(draft) })) setEditing(null)
                }}
              >
                <Fields d={draft} set={setDraft} allergens={allergens} />
                <div className="mt-2 flex gap-2">
                  <button type="submit" disabled={pending} className="min-h-12 rounded bg-enamel px-4 font-semibold text-plate disabled:opacity-60">
                    Save
                  </button>
                  <button type="button" className="min-h-12 px-4" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex gap-3">
                <div className="w-[72px] shrink-0">
                  <PotNumber n={c.potNumber} />
                  {c.photoPath && (
                    // eslint-disable-next-line @next/next/no-img-element -- avoid image optimizer cost
                    <img src={photoUrl(c.photoPath)} alt={`Photo of ${c.name}`} loading="lazy" className="mt-2 size-16 rounded object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[22px] font-semibold">{c.name}</p>
                  <p>Cook: {c.cook ?? 'none'}</p>
                  {c.description && <p>{c.description}</p>}
                  <p>
                    Allergens:{' '}
                    {c.allergenIds.map((id) => allergens.find((a) => a.id === id)?.label ?? id).join(', ') || 'none'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="min-h-12 rounded border border-enamel px-4"
                      onClick={() => {
                        setEditing(c.id)
                        setDraft(fromChili(c))
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="min-h-12 rounded border border-chili px-4 text-chili disabled:opacity-60"
                      onClick={() => confirm(`Delete ${c.name}?`) && run({ action: 'delete', chiliId: c.id })}
                    >
                      Delete
                    </button>
                    {c.photoPath && (
                      <button
                        type="button"
                        disabled={pending}
                        className="min-h-12 rounded border border-chili px-4 text-chili disabled:opacity-60"
                        onClick={() => confirm(`Remove the photo from ${c.name}?`) && run({ action: 'removePhoto', chiliId: c.id })}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form
        className="border-t border-rule pt-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (await run({ action: 'create', ...payload(adding) })) setAdding(blank)
        }}
      >
        <h3 className="text-[22px] font-semibold">Add a chili</h3>
        <Fields d={adding} set={setAdding} allergens={allergens} />
        <button type="submit" disabled={pending} className="mt-3 min-h-12 rounded bg-enamel px-6 font-semibold text-plate disabled:opacity-60">
          Add chili
        </button>
      </form>
    </section>
  )
}
