// src/app/(dashboard)/commercant/employes/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function PageEmployes() {
  const session = await auth()
  
  if (!session) {
    redirect("/connexion")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestion des Employés</h1>
      <p className="text-gray-500">Gérez vos employés et leurs accès</p>
      {/* Vous pourrez ajouter la liste des employés ici */}
    </div>
  )
}