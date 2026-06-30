// app/(dashboard)/commercant/boutiques/page.tsx
// Shell statique — données chargées côté client avec fallback offline
import { BoutiquesPageClient } from "@/components/boutiques/boutiques-page-client"

export default function PageBoutiques() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Mes Boutiques</h1>
        <p className="text-gray-500 mt-1">Gérez vos boutiques</p>
      </div>
      <BoutiquesPageClient />
    </div>
  )
}