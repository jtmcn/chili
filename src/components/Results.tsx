import { ordinal } from '@/lib/rank'
import type { ResultRow } from '@/lib/types'
import { PotNumber } from './PotNumber'
import { Ribbon } from './Ribbon'

export function Results({
  rows,
  topTags,
}: {
  rows: ResultRow[]
  topTags: (chiliId: string) => { label: string; count: number }[]
}) {
  return (
    <ol className="divide-y divide-rule">
      {rows.map((r) => {
        const tied = rows.filter((o) => o.rank === r.rank).length > 1
        const text = `${tied ? 'T-' : ''}${ordinal(r.rank)}`
        const tags = topTags(r.chiliId)
        return (
          <li key={r.chiliId} className="flex min-h-[72px] items-start gap-3 py-3">
            <span className="flex w-[72px] shrink-0 justify-center">
              <PotNumber n={r.potNumber} size="row" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[22px] font-semibold leading-tight">{r.name}</span>
              <span className="block">{r.cook ? `Cook: ${r.cook}` : null}</span>
              <span className="block">
                {r.points === 1 ? '1 point' : `${r.points} points`} · {r.firsts === 1 ? '1 first' : `${r.firsts} firsts`}
              </span>
              {tags.length > 0 && (
                <span className="mt-1 flex flex-wrap gap-x-3">
                  {tags.map((t) => (
                    <span key={t.label}>{`${t.label} ${t.count}`}</span>
                  ))}
                </span>
              )}
            </span>
            {r.rank <= 3 ? <Ribbon rank={r.rank as 1 | 2 | 3} label={text} /> : <span className="font-semibold">{text}</span>}
          </li>
        )
      })}
    </ol>
  )
}
