'use client'

import { useState } from 'react'
import { getDeviceId } from '@/lib/device-id'
import { postJson } from '@/lib/post-json'
import { loadMyTags, saveMyTags } from '@/lib/tags'
import type { RefItem, TagCount } from '@/lib/types'

export function TagButtons({
  chiliId,
  tags,
  counts,
  enabled,
  onChanged,
}: {
  chiliId: string
  tags: RefItem[]
  counts: TagCount[]
  enabled: boolean
  onChanged?: () => void
}) {
  const [mine, setMine] = useState(loadMyTags)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [shown, setShown] = useState<Record<string, number>>({})
  const [prevCounts, setPrevCounts] = useState(counts)
  if (counts !== prevCounts) {
    // fresh server data supersedes optimistic counts for idle tags
    setPrevCounts(counts)
    setShown((s) => Object.fromEntries(Object.entries(s).filter(([id]) => pending.has(id))))
  }

  const serverCount = (tagId: string) =>
    counts.find((c) => c.chiliId === chiliId && c.tagId === tagId)?.count ?? 0

  async function toggle(tagId: string) {
    const key = `${chiliId}:${tagId}`
    const on = !mine.has(key)
    const before = shown[tagId] ?? serverCount(tagId)
    const apply = (set: Set<string>) => {
      const next = new Set(set)
      if (on) next.add(key)
      else next.delete(key)
      return next
    }
    setPending((p) => new Set(p).add(tagId))
    setShown((s) => ({ ...s, [tagId]: Math.max(0, before + (on ? 1 : -1)) }))
    setMine((m) => apply(m))
    const res = await postJson('/api/tag', { chiliId, tagId, deviceId: getDeviceId(), on })
    setPending((p) => {
      const next = new Set(p)
      next.delete(tagId)
      return next
    })
    if (res.ok) {
      saveMyTags(apply(loadMyTags()))
      onChanged?.()
    } else {
      setShown((s) => ({ ...s, [tagId]: before }))
      setMine((m) => {
        const next = new Set(m)
        if (on) next.delete(key)
        else next.add(key)
        return next
      })
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => {
        const pressed = mine.has(`${chiliId}:${t.id}`)
        const busy = pending.has(t.id)
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={pressed}
            disabled={!enabled || busy}
            onClick={() => toggle(t.id)}
            className={`min-h-12 rounded-full px-4 text-[18px] ${
              pressed ? 'bg-enamel text-plate' : 'bg-[#EEF2FA] text-ink'
            } ${busy ? 'opacity-60' : ''} disabled:cursor-not-allowed`}
          >
            {pressed && <span aria-hidden="true">✓ </span>}
            {`${t.label} ${shown[t.id] ?? serverCount(t.id)}`}
          </button>
        )
      })}
    </div>
  )
}
