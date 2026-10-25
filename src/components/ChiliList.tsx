import Link from 'next/link'
import type { PublicChili, RefItem } from '@/lib/types'
import { ChiliCard } from './ChiliCard'

export function ChiliList({
  chilis,
  allergens,
  entriesOpen,
}: {
  chilis: PublicChili[]
  allergens: RefItem[]
  entriesOpen: boolean
}) {
  if (!chilis.length) {
    return (
      <p className="py-6 text-[18px]">
        No chilis yet. Bringing one?{' '}
        {entriesOpen ? (
          <Link href="/add" className="text-enamel underline">
            Add it
          </Link>
        ) : (
          'Add it'
        )}
        .
      </p>
    )
  }
  return (
    <ul className="divide-y divide-rule">
      {chilis.map((c) => (
        <li key={c.id}>
          <ChiliCard chili={c} allergens={allergens} />
        </li>
      ))}
    </ul>
  )
}
