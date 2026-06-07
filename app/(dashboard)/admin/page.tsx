// src/app/(dashboard)/admin/page.tsx
import { TableauDeBordAdmin } from "@/components/dashboard/tableau-de-bord-admin"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function PageAdmin() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/connexion")
  }

  // Données fictives pour l'instant
  const statistiques = {
    nombreBoutiques: 0,
    nombreCommercants: 0,
    nombreAbonnementsActifs: 0,
    revenuTotal: 0,
    ventesDuMois: 0,
  }

  return <TableauDeBordAdmin statistiques={statistiques} />
}