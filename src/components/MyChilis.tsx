'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getDeviceId } from '@/lib/device-id'
import { postJson } from '@/lib/post-json'
import type { PublicChili } from '@/lib/types'

// The chilis this phone added, with an edit link; shown until reveal.
export function MyChilis() {
  const [mine, setMine] = useState<PublicChili[]>([])
  useEffect(() => {
    postJson<{ chilis: PublicChili[] }>('/api/chili/mine', { deviceId: getDeviceId() }, { retries: 0 }).then(
      (r) => r.ok && setMine(r.chilis),
    )
  }, [])
  if (!mine.length) return null
  return (
    <section aria-label="Your chilis" className="mt-4 rounded-[10px] border border-rule px-4 py-2">
      <ul className="divide-y divide-rule">
        {mine.map((c) => (
          <li key={c.id} className="flex min-h-12 items-center justify-between gap-3">
            <span className="min-w-0">
              Your chili: <span className="font-semibold">#{c.potNumber} {c.name}</span>
            </span>
            <Link href={`/add?edit=${c.id}`} className="flex min-h-12 min-w-12 items-center text-enamel underline">
              Edit<span className="sr-only"> {c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
