const FILL = {
  1: '[--fill:var(--color-ribbon-gold)] text-ink',
  2: '[--fill:var(--color-enamel)] text-plate',
  3: '[--fill:var(--color-rule)] text-ink',
} as const

const DISC = {
  1: 'bg-ribbon-gold',
  2: 'bg-enamel',
  3: 'bg-plate border-2 border-rule',
} as const

// Drop-in order is 3rd then 2nd then 1st, ~150 ms apart; globals.css disables it for reduced motion.
export function Ribbon({ rank, label }: { rank: 1 | 2 | 3; label?: string }) {
  return (
    <span
      data-testid={`ribbon-${rank}`}
      className={`ribbon ribbon-drop relative block h-[68px] w-14 shrink-0 ${FILL[rank]}`}
      style={{ animationDelay: `${(3 - rank) * 150}ms` }}
    >
      <span aria-hidden="true" className="rosette absolute inset-x-0 top-0 h-14" />
      <span
        className={`absolute top-[5px] left-[5px] z-10 flex size-[46px] items-center justify-center rounded-full text-[17px] font-semibold leading-none tracking-tight outline-2 -outline-offset-4 outline-current/20 outline-dashed ${DISC[rank]}`}
      >
        {label ?? ordinal(rank)}
      </span>
    </span>
  )
}

function ordinal(n: number) {
  return ['', '1st', '2nd', '3rd'][n]
}
