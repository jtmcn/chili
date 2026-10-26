'use client'

import { useSearchParams } from 'next/navigation'
import { EventBand } from '@/components/EventBand'
import { Wizard } from './Wizard'

export function AddScreen() {
  const edit = useSearchParams().get('edit') ?? undefined
  return (
    <>
      <EventBand size="compact">{edit ? 'Edit your chili' : 'Add your chili'}</EventBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5">
        <Wizard editId={edit} />
      </main>
    </>
  )
}
