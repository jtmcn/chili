export function TagPills({ tags }: { tags: { label: string; count: number }[] }) {
  if (!tags.length) return null
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t.label} className="rounded-full bg-[#EEF2FA] px-2.5 py-0.5 text-[16px]">
          {t.label} <b className="font-bold">{t.count}</b>
        </span>
      ))}
    </span>
  )
}
