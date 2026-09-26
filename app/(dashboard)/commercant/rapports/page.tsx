// app/(dashboard)/commercant/rapports/page.tsx
// Shell statique — données chargées côté client avec fallback offline
import { RapportsPageClient } from "@/components/dashboard/commercant/rapports-page-client"

export const dynamic = "force-static"

export default function PageRapports() {
  return (
    <div className="space-y-6">
      <RapportsPageClient />
    </div>
  )
}