// src/app/(dashboard)/admin/boutiques/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function PageAdminBoutiques() {
  const session = await auth()
  
  if (!session) {
    redirect("/connexion")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestion des Boutiques</h1>
      <p className="text-gray-500">Gérez toutes les boutiques de la plateforme</p>
    </div>
  )
}