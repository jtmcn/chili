import type { ReactNode } from 'react'

// Full-bleed speckled header; inner content sits on the max-w-md column's gutters.
export function EventBand({ size, children }: { size: 'hero' | 'compact'; children?: ReactNode }) {
  return (
    <header className="enamel print:hidden">
      {size === 'hero' ? (
        <div className="mx-auto w-full max-w-md px-4 pt-5 pb-[18px]">{children}</div>
      ) : (
        <div className="mx-auto flex h-14 w-full max-w-md items-center px-4">
          <p className="truncate text-[18px] font-semibold">{children}</p>
        </div>
      )}
    </header>
  )
}
