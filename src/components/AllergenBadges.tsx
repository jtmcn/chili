import type { RefItem } from '@/lib/types'

export function AllergenBadges({ ids, allergens }: { ids: string[]; allergens: RefItem[] }) {
  const labels = allergens.filter((a) => ids.includes(a.id)).map((a) => a.label)
  if (!labels.length) return null
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {labels.map((l) => (
        <li key={l} className="rounded-full border-[1.5px] border-rule px-2.5 py-px text-[16px] text-ink">
          {l}
        </li>
      ))}
    </ul>
  )
}
