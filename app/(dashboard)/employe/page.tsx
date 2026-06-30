// app/(dashboard)/employe/page.tsx
// Shell statique — données chargées côté client avec fallback offline
import { EmployeDashboardClient } from "@/components/employe/employe-dashboard-client"

export default function PageDashboardEmploye() {
  return <EmployeDashboardClient />
}