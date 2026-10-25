import Link from 'next/link'
import { topTags } from '@/lib/tags'
import type { PublicChili, RefItem, TagCount } from '@/lib/types'
import { ChiliCard } from './ChiliCard'
import { PotNumber } from './PotNumber'

export function ChiliList({
  chilis,
  allergens,
  entriesOpen,
  tags = [],
  tagCounts = [],
}: {
  chilis: PublicChili[]
  allergens: RefItem[]
  entriesOpen: boolean
  tags?: RefItem[]
  tagCounts?: TagCount[]
}) {
  if (!chilis.length) {
    return (
      <div className="grid justify-items-center gap-4 px-2 py-10 text-center">
        <PotNumber empty />
        <p className="max-w-[26ch] text-[18px]">
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
      </div>
    )
  }
  return (
    <ul className="divide-y divide-rule">
      {chilis.map((c) => (
        <li key={c.id}>
          <ChiliCard chili={c} allergens={allergens} topTags={topTags(tagCounts, c.id, tags)} />
        </li>
      ))}
    </ul>
  )
}
