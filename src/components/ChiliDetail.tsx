import Link from 'next/link'
import type { PublicChili, RefItem } from '@/lib/types'
import { AllergenBadges } from './AllergenBadges'
import { AllergenDisclaimer } from './AllergenDisclaimer'
import { PotNumber } from './PotNumber'

export function ChiliDetail({ chili, allergens }: { chili: PublicChili; allergens: RefItem[] }) {
  return (
    <>
      <Link href="/" className="flex min-h-12 items-center text-enamel underline">
        Back to all chilis
      </Link>
      <div className="mt-2">
        <PotNumber n={chili.potNumber} size="detail" />
      </div>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight">{chili.name}</h1>
      {chili.description && <p className="mt-3 text-[18px]">{chili.description}</p>}
      <div className="mt-4">
        <AllergenBadges ids={chili.allergenIds} allergens={allergens} />
      </div>
      <div className="mt-4">
        <AllergenDisclaimer />
      </div>
    </>
  )
}
