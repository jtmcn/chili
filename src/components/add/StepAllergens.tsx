import type { RefItem } from '@/lib/types'

const pill = (on: boolean) =>
  `min-h-12 rounded-full border px-4 ${on ? 'border-enamel bg-enamel text-plate' : 'border-ink'}`

export function StepAllergens({
  items,
  selected,
  none,
  onToggle,
  onNone,
  error,
  onRetry,
}: {
  items: RefItem[]
  selected: string[]
  none: boolean
  onToggle: (id: string) => void
  onNone: () => void
  error: string | null
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Does it contain any allergens?</h1>
      {error && (
        <div role="alert" className="flex items-center gap-3 text-chili">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="min-h-12 min-w-12 text-enamel underline">
            Retry
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((a) => {
          const on = selected.includes(a.id)
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              disabled={none}
              onClick={() => onToggle(a.id)}
              className={`${pill(on)} disabled:opacity-60`}
            >
              {on && '✓ '}
              {a.label}
            </button>
          )
        })}
      </div>
      <button type="button" aria-pressed={none} onClick={onNone} className={pill(none)}>
        {none && '✓ '}None of these
      </button>
    </div>
  )
}
