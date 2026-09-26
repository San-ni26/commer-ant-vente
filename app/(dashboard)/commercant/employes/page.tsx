// app/(dashboard)/commercant/employes/page.tsx
// Shell statique — données chargées côté client avec fallback offline
import { EmployesPageClient } from "@/components/employe/employes-page-client"

export const dynamic = "force-static"

export default function PageEmployes() {
  return <EmployesPageClient />
}