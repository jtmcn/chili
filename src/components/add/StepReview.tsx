import { AllergenDisclaimer } from '@/components/AllergenDisclaimer'
import type { RefItem } from '@/lib/types'
import type { Step, WizardState } from '@/lib/wizard'

export function StepReview({
  s,
  allergens,
  onEdit,
}: {
  s: WizardState
  allergens: RefItem[]
  onEdit: (step: Step) => void
}) {
  const labels = s.allergens.map((id) => allergens.find((a) => a.id === id)?.label ?? id)
  const edit = (step: Step, what: string) => (
    <button type="button" onClick={() => onEdit(step)} className="min-h-12 min-w-12 text-enamel underline">
      Edit<span className="sr-only"> {what}</span>
    </button>
  )
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Ready to add it?</h1>
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <div>
          <p className="text-[22px] font-semibold">{s.name.trim()}</p>
          {s.cook.trim() && <p>{s.cook.trim()}</p>}
        </div>
        {edit(1, 'name')}
      </div>
      {s.description.trim() && (
        <div className="flex items-center justify-between border-b border-rule pb-2">
          <p>{s.description.trim()}</p>
          {edit(2, 'description')}
        </div>
      )}
      <div className="flex items-center justify-between border-b border-rule pb-2">
        {s.noAllergens ? (
          <p>No allergens</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {labels.map((l) => (
              <li key={l} className="rounded-full border border-rule px-3 py-1">
                {l}
              </li>
            ))}
          </ul>
        )}
        {edit(3, 'allergens')}
      </div>
      <AllergenDisclaimer />
    </div>
  )
}
