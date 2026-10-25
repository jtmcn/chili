import { ordinal } from '@/lib/rank'
import type { ResultRow } from '@/lib/types'
import { PotNumber } from './PotNumber'
import { Ribbon } from './Ribbon'
import { TagPills } from './TagPills'

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
          <li key={r.chiliId} className="grid min-h-[72px] grid-cols-[72px_1fr_auto] items-start gap-3.5 py-3.5">
            <PotNumber n={r.potNumber} size="row" />
            <span className="min-w-0">
              <span className="mt-0.5 block text-[22px] font-semibold leading-tight">{r.name}</span>
              <span className="block">{r.cook ? `Cook: ${r.cook}` : null}</span>
              <span className="block">
                {r.points === 1 ? '1 point' : `${r.points} points`} · {r.firsts === 1 ? '1 first' : `${r.firsts} firsts`}
              </span>
              <TagPills tags={tags} />
            </span>
            {r.rank <= 3 ? (
              <Ribbon rank={r.rank as 1 | 2 | 3} label={text} />
            ) : (
              <span className="flex w-14 justify-center pt-4 font-semibold">{text}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
