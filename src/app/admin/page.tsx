import { AdminGate } from '@/components/admin/AdminGate'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { EventBand } from '@/components/EventBand'

export default function AdminPage() {
  return (
    <>
      <EventBand size="compact">Host</EventBand>
      <AdminGate>
        <AdminDashboard />
      </AdminGate>
    </>
  )
}
