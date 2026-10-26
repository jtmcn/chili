export function StepName({
  name,
  cook,
  error,
  onChange,
}: {
  name: string
  cook: string
  error: string | null
  onChange: (field: 'name' | 'cook', value: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold leading-tight">What&apos;s your chili called?</h1>
      <label className="flex flex-col gap-2">
        Chili name
        <input
          value={name}
          maxLength={40}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'name-error' : undefined}
          onChange={(e) => onChange('name', e.target.value)}
          className="min-h-[52px] rounded-[10px] border-2 border-ink px-3"
        />
      </label>
      {error && (
        <p id="name-error" role="alert" className="text-chili">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-2">
        Your name
        <input
          value={cook}
          maxLength={40}
          autoComplete="name"
          aria-describedby="cook-hint"
          onChange={(e) => onChange('cook', e.target.value)}
          className="min-h-[52px] rounded-[10px] border-2 border-ink px-3"
        />
        <span id="cook-hint" className="text-[15px] opacity-80">
          Hidden until the results, then shown with your chili.
        </span>
      </label>
    </div>
  )
}
