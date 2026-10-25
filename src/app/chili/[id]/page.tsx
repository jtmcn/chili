import { Suspense } from 'react'
import { ChiliView } from './chili-view'

export default function ChiliPage() {
  return (
    <Suspense>
      <ChiliView />
    </Suspense>
  )
}
