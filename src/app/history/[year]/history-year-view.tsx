'use client'

import { useParams } from 'next/navigation'
import { HistoryYear } from '@/components/HistoryYear'

export function HistoryYearView() {
  const { year } = useParams<{ year: string }>()
  return <HistoryYear year={year} />
}
