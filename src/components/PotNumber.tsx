// Card box, fold-line offset, number size.
const SIZES = {
  row: ['h-16 w-[72px]', 'before:top-[9px]', 'pt-2 text-[40px]'],
  detail: ['h-28 w-32', 'before:top-4', 'pt-3 text-[72px]'],
  hero: ['h-[min(50vw,214px)] w-[min(56vw,240px)]', 'before:top-[min(4vw,18px)]', 'pt-[min(4vw,18px)] text-[min(40vw,200px)]'],
} as const

const card =
  'relative grid shrink-0 place-items-center rounded border-2 bg-plate before:absolute before:inset-x-1.5 before:border-t-[1.5px] before:border-dashed before:border-rule'

// A white table card with a fold line; `empty` is the decorative "?" placeholder.
export function PotNumber({ n, size = 'row', empty = false }: { n?: number; size?: keyof typeof SIZES; empty?: boolean }) {
  if (empty) {
    return (
      <span aria-hidden="true" className={`${card} h-[104px] w-[120px] border-dashed border-[#9AA6C0] before:top-3.5`}>
        <span className="font-pot pt-3 text-[56px] leading-none text-[#9AA6C0]">?</span>
      </span>
    )
  }
  const [box, fold, num] = SIZES[size]
  return (
    <span className={`${card} ${box} ${fold} border-ink`}>
      <span aria-label={`Pot ${n}`} role="img" className={`font-pot leading-none ${num}`}>
        {n}
      </span>
    </span>
  )
}
