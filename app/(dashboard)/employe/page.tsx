// src/app/(dashboard)/employe/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function PageEmploye() {
  const session = await auth()
  
  if (!session) {
    redirect("/connexion")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tableau de Bord Employé</h1>
      <p className="text-gray-500">Enregistrez vos ventes quotidiennes</p>
    </div>
  )
}