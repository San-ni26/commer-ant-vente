// src/app/(dashboard)/commercant/rapports/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function PageRapports() {
  const session = await auth()
  
  if (!session) {
    redirect("/connexion")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rapports</h1>
      <p className="text-gray-500">Visualisez vos rapports et statistiques</p>
      {/* Vous pourrez ajouter les graphiques et rapports ici */}
    </div>
  )
}