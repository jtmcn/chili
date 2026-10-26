import { Suspense } from 'react'
import { HistoryYearView } from './history-year-view'

export default function HistoryYearPage() {
  return (
    <Suspense>
      <HistoryYearView />
    </Suspense>
  )
}
