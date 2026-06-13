// src/app/(dashboard)/admin/abonnements/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma, avecRetry } from "@/lib/prisma"
import { GestionAbonnements } from "@/components/admin/gestion-abonnements"

export default async function PageAbonnements() {
  const session = await auth()

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/connexion")
  }

  try {
    const [abonnements, boutiques] = await Promise.all([
      avecRetry(() =>
        prisma.abonnement.findMany({
          include: {
            boutique: { select: { id: true, nom: true } },
            commercant: { select: { id: true, nom: true, email: true } }
          },
          orderBy: { dateCreation: "desc" }
        })
      ),
      // Récupérer les boutiques AVEC le nom du commerçant propriétaire
      avecRetry(() =>
        prisma.boutique.findMany({
          select: {
            id: true,
            nom: true,
            commercantId: true,
            commercant: { select: { nom: true, email: true } }
          },
          orderBy: { nom: "asc" }
        })
      )
    ])

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestion des Abonnements</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Créez, gérez et révoquez les abonnements des boutiques
          </p>
        </div>
        <GestionAbonnements abonnements={abonnements} boutiques={boutiques} />
      </div>
    )
  } catch (error) {
    console.error("Erreur chargement abonnements:", error)
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Erreur de chargement</h1>
        <p className="text-gray-500 mt-2">Impossible de charger les abonnements</p>
      </div>
    )
  }
}