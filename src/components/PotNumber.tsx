const SIZES = {
  row: 'text-[56px]',
  detail: 'text-[96px]',
  hero: 'text-[min(40vw,200px)]',
} as const

export function PotNumber({ n, size = 'row' }: { n: number; size?: keyof typeof SIZES }) {
  return (
    <span aria-label={`Pot ${n}`} role="img" className={`font-pot leading-none ${SIZES[size]}`}>
      {n}
    </span>
  )
}
