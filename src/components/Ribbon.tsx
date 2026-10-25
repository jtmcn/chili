const FILL = {
  1: 'bg-ribbon-gold text-ink',
  2: 'bg-enamel text-plate',
  3: 'bg-plate text-ink border-2 border-rule',
} as const

// Drop-in order is 3rd then 2nd then 1st, ~150 ms apart; globals.css disables it for reduced motion.
export function Ribbon({ rank, label }: { rank: 1 | 2 | 3; label?: string }) {
  return (
    <span
      data-testid={`ribbon-${rank}`}
      className={`ribbon-drop inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold leading-none ${FILL[rank]}`}
      style={{ animationDelay: `${(3 - rank) * 150}ms` }}
    >
      {label ?? ordinal(rank)}
    </span>
  )
}

function ordinal(n: number) {
  return ['', '1st', '2nd', '3rd'][n]
}
