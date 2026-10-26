import Image from 'next/image'
import Link from 'next/link'
import { photoUrl } from '@/lib/photo'
import type { PublicChili, RefItem } from '@/lib/types'
import { AllergenBadges } from './AllergenBadges'
import { PotNumber } from './PotNumber'
import { TagPills } from './TagPills'

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
    <Link
      href={`/chili/${chili.id}`}
      className={`grid min-h-[72px] gap-3.5 py-3.5 ${chili.photoPath ? 'grid-cols-[72px_1fr_72px]' : 'grid-cols-[72px_1fr]'}`}
    >
      <PotNumber n={chili.potNumber} size="row" />
      <span className="min-w-0">
        <span className="mt-0.5 mb-1.5 block text-[22px] font-semibold leading-tight">{chili.name}</span>
        <AllergenBadges ids={chili.allergenIds} allergens={allergens} />
        <TagPills tags={topTags} />
      </span>
      {chili.photoPath && (
        // Optimizer serves a small WebP so the list stays light on weak signal.
        <Image
          data-thumb
          src={photoUrl(chili.photoPath)}
          alt=""
          width={72}
          height={72}
          sizes="72px"
          className="size-[72px] rounded-[10px] border border-rule object-cover"
        />
      )}
    </Link>
  )
}
