'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChiliDetail } from '@/components/ChiliDetail'
import { fetchChili } from '@/lib/chilis'
import { useLive } from '@/lib/live'
import { fetchAllergens } from '@/lib/reference'

export function ChiliView() {
  const { id } = useParams<{ id: string }>()
  const { data: chili } = useLive(['chilis'], () => fetchChili(id))
  const { data: allergens } = useLive([], fetchAllergens, 86_400_000)
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      {chili ? (
        <ChiliDetail chili={chili} allergens={allergens ?? []} />
      ) : (
        chili === null && (
          <>
            <p className="text-[18px]">Chili not found.</p>
            <Link href="/" className="flex min-h-12 items-center text-enamel underline">
              Back to all chilis
            </Link>
          </>
        )
      )}
    </main>
  )
}
