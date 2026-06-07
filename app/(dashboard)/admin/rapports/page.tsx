// src/app/(dashboard)/admin/rapports/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function PageAdminRapports() {
  const session = await auth()
  
  if (!session) {
    redirect("/connexion")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rapports Administrateur</h1>
      <p className="text-gray-500">Visualisez les rapports globaux</p>
    </div>
  )
}