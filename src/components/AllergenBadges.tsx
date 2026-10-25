import type { RefItem } from '@/lib/types'

export function AllergenBadges({ ids, allergens }: { ids: string[]; allergens: RefItem[] }) {
  const labels = allergens.filter((a) => ids.includes(a.id)).map((a) => a.label)
  if (!labels.length) return null
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {labels.map((l) => (
        <li key={l} className="rounded-full border border-rule px-2.5 py-0.5 text-[18px] text-ink">
          {l}
        </li>
      ))}
    </ul>
  )
}
