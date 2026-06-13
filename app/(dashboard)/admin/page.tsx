// src/app/(dashboard)/admin/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma, avecRetry } from "@/lib/prisma"
import { TableauDeBordAdmin } from "@/components/dashboard/tableau-de-bord-admin"

export default async function PageAdmin() {
  const session = await auth()

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/connexion")
  }

  try {
    // Expirer les abonnements dépassés globalement
    await avecRetry(() =>
      prisma.abonnement.updateMany({
        where: { statut: "ACTIF", dateFin: { lt: new Date() } },
        data: { statut: "EXPIRE" }
      })
    )

    const maintenant = new Date()
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)

    const [
      nombreBoutiques,
      nombreCommercants,
      nombreAbonnementsActifs,
      abonnementsExpirant,
      ventesDuMois,
      revenuTotal,
      // Boutiques avec leur abonnement actif (pour détecter celles sans abonnement)
      boutiquesAvecAbonnement
    ] = await Promise.all([
      avecRetry(() => prisma.boutique.count()),
      avecRetry(() => prisma.utilisateur.count({ where: { role: "COMMERCANT" } })),
      avecRetry(() => prisma.abonnement.count({ where: { statut: "ACTIF" } })),
      avecRetry(() =>
        prisma.abonnement.findMany({
          where: {
            statut: "ACTIF",
            dateFin: { lte: new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000) }
          },
          include: {
            boutique: { select: { nom: true } },
            commercant: { select: { nom: true, email: true } }
          },
          orderBy: { dateFin: "asc" },
          take: 10
        })
      ),
      avecRetry(() =>
        prisma.vente.aggregate({
          where: { dateVente: { gte: debutMois } },
          _sum: { montant: true }
        })
      ),
      avecRetry(() =>
        prisma.abonnement.aggregate({
          where: { statut: "ACTIF" },
          _sum: { montant: true }
        })
      ),
      // Récupérer toutes les boutiques avec leur abonnement actif (s'il existe)
      avecRetry(() =>
        prisma.boutique.findMany({
          include: {
            commercant: { select: { nom: true, email: true } },
            abonnements: {
              where: { statut: "ACTIF", dateFin: { gte: new Date() } },
              orderBy: { dateFin: "desc" },
              take: 1,
              select: { id: true, dateFin: true, duree: true }
            }
          },
          orderBy: { dateCreation: "desc" }
        })
      )
    ])

    // Boutiques sans abonnement actif
    const boutiqueSansAbonnement = boutiquesAvecAbonnement
      .filter(b => b.abonnements.length === 0)
      .map(b => ({
        id: b.id,
        nom: b.nom,
        commercant: b.commercant.nom,
        email: b.commercant.email
      }))

    return (
      <TableauDeBordAdmin
        nombreBoutiques={nombreBoutiques}
        nombreCommercants={nombreCommercants}
        nombreAbonnementsActifs={nombreAbonnementsActifs}
        ventesDuMois={ventesDuMois._sum.montant || 0}
        revenuTotal={revenuTotal._sum.montant || 0}
        boutiqueSansAbonnement={boutiqueSansAbonnement}
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