// src/app/(dashboard)/commercant/boutiques/[id]/ventes/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PageVentes({ params }: PageProps) {
  const session = await auth()
  
  if (!session) {
    redirect("/connexion")
  }

  const { id } = await params

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ventes de la Boutique</h1>
      <p>Boutique ID: {id}</p>
      {/* Vous pouvez ajouter ici un composant ListeVentes plus tard */}
    </div>
  )
}