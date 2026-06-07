// src/app/(dashboard)/employe/ventes/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function PageVentesEmploye() {
  const session = await auth()
  
  if (!session) {
    redirect("/connexion")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Enregistrer une Vente</h1>
      <p className="text-gray-500">Ajoutez vos ventes quotidiennes</p>
    </div>
  )
}