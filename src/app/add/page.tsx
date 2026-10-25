import { Wizard } from '@/components/add/Wizard'
import { EventBand } from '@/components/EventBand'

export default function AddPage() {
  return (
    <>
      <EventBand size="compact">Add your chili</EventBand>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5">
        <Wizard />
      </main>
    </>
  )
}
