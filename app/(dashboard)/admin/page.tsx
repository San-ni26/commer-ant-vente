// src/app/(dashboard)/admin/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { TableauDeBordAdmin } from "@/components/dashboard/tableau-de-bord-admin"

export default async function PageAdmin() {
  const session = await auth()

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/connexion")
  }

  try {
    const maintenant = new Date()
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)

    const [
      nombreBoutiques,
      nombreCommercants,
      nombreAbonnementsActifs,
      abonnementsExpirant,
      ventesDuMois,
      revenuTotal
    ] = await Promise.all([
      prisma.boutique.count(),
      prisma.utilisateur.count({ where: { role: "COMMERCANT" } }),
      prisma.abonnement.count({ where: { statut: "ACTIF" } }),
      prisma.abonnement.findMany({
        where: {
          statut: "ACTIF",
          dateFin: {
            lte: new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          boutique: { select: { nom: true } },
          commercant: { select: { nom: true, email: true } }
        },
        orderBy: { dateFin: 'asc' },
        take: 10
      }),
      prisma.vente.aggregate({
        where: { dateVente: { gte: debutMois } },
        _sum: { montant: true }
      }),
      prisma.abonnement.aggregate({
        where: { statut: "ACTIF" },
        _sum: { montant: true }
      })
    ])

    // Passer les props directement, pas dans un objet statistiques
    return (
      <TableauDeBordAdmin
        nombreBoutiques={nombreBoutiques}
        nombreCommercants={nombreCommercants}
        nombreAbonnementsActifs={nombreAbonnementsActifs}
        ventesDuMois={ventesDuMois._sum.montant || 0}
        revenuTotal={revenuTotal._sum.montant || 0}
        abonnementsExpirant={abonnementsExpirant.map(a => ({
          id: a.id,
          boutique: a.boutique.nom,
          commercant: a.commercant.nom,
          email: a.commercant.email,
          dateFin: a.dateFin,
          duree: a.duree,
          montant: a.montant
        }))}
      />
    )
  } catch (error) {
    console.error("Erreur dashboard admin:", error)
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Erreur de chargement</h1>
      </div>
    )
  }
}