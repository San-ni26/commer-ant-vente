// app/(dashboard)/employe/ventes/page.tsx
// Shell statique — données chargées côté client avec fallback offline
import { VentesEmployePageClient } from "@/components/employe/ventes-employe-page-client"

export const dynamic = "force-static"

export default function PageVentesEmploye() {
  return <VentesEmployePageClient />
}