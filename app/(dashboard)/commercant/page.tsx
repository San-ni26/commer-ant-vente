// app/(dashboard)/commercant/page.tsx
// Shell statique — données chargées côté client avec fallback offline
import { DashboardCommercantClient } from "@/components/dashboard/dashboard-commercant-client"

export default function PageDashboardCommercant() {
  return (
    <div className="space-y-6">
      <DashboardCommercantClient />
    </div>
  )
}