import { Suspense } from 'react'
import { AddScreen } from '@/components/add/AddScreen'

// Suspense keeps /add static; ?edit= is read on the client.
export default function AddPage() {
  return (
    <Suspense>
      <AddScreen />
    </Suspense>
  )
}
