export function StepDescription({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">Anything to tell tasters?</h1>
      <label className="flex flex-col gap-2">
        Description (optional)
        <textarea
          value={value}
          maxLength={200}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-ink px-3 py-2"
        />
      </label>
      <p aria-live="polite">{value.length}/200</p>
    </div>
  )
}
