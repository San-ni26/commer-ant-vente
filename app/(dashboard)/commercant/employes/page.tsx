// app/(dashboard)/commercant/employes/page.tsx
// Shell statique — données chargées côté client avec fallback offline
import { EmployesPageClient } from "@/components/employe/employes-page-client"

export default function PageEmployes() {
  return <EmployesPageClient />
}