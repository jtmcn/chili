import Link from 'next/link'
import { PotNumber } from '@/components/PotNumber'

export function Success({ potNumber }: { potNumber: number }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <PotNumber n={potNumber} size="hero" />
      <p className="text-[28px] font-semibold leading-tight">Write this on your table card</p>
      <Link href="/" className="flex min-h-12 items-center text-enamel underline">
        Back to the list
      </Link>
    </div>
  )
}
