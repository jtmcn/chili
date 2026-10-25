import Link from 'next/link'
import type { PublicChili, RefItem } from '@/lib/types'
import { AllergenBadges } from './AllergenBadges'
import { PotNumber } from './PotNumber'

// Deliberately ignores `cook`: it stays hidden until reveal.
export function ChiliCard({
  chili,
  allergens,
  topTags = [],
}: {
  chili: PublicChili
  allergens: RefItem[]
  topTags?: { label: string; count: number }[]
}) {
  return (
    <Link href={`/chili/${chili.id}`} className="flex min-h-[72px] items-start gap-3 py-3">
      <span className="flex w-[72px] shrink-0 justify-center">
        <PotNumber n={chili.potNumber} size="row" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[22px] font-semibold leading-tight">{chili.name}</span>
        <AllergenBadges ids={chili.allergenIds} allergens={allergens} />
        {topTags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-x-3 text-[18px]">
            {topTags.map((t) => (
              <span key={t.label}>{`${t.label} ${t.count}`}</span>
            ))}
          </span>
        )}
      </span>
    </Link>
  )
}
