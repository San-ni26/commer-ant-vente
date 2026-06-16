// src/app/(dashboard)/commercant/boutiques/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma, avecRetry } from "@/lib/prisma"
import { GestionBoutiques } from "@/components/boutiques/gestion-boutiques"

export default async function PageBoutiques() {
  const session = await auth()

  if (!session?.user) {
    redirect("/connexion")
  }

  // L'expiration et la lecture partent en parallèle — elles sont indépendantes
  const [, boutiques] = await Promise.all([
    // 1. Expirer les abonnements dépassés (fire & forget dans le Promise.all)
    avecRetry(() =>
      prisma.abonnement.updateMany({
        where: {
          commercantId: session.user.id,
          statut: "ACTIF",
          dateFin: { lt: new Date() }
        },
        data: { statut: "EXPIRE" }
      })
    ),
    // 2. Récupérer toutes les boutiques du commerçant avec leur abonnement actif
    avecRetry(() =>
      prisma.boutique.findMany({
        where: { commercantId: session.user.id },
        include: {
          _count: { select: { ventes: true, employes: true } },
          gerant: { select: { nom: true, prenom: true } },
          abonnements: {
            where: { statut: "ACTIF", dateFin: { gte: new Date() } },
            orderBy: { dateFin: "desc" },
            take: 1,
            select: { id: true, dateFin: true, duree: true, statut: true }
          }
        },
        orderBy: { dateCreation: 'desc' }
      })
    )
  ])

  // 3. Formater les boutiques avec leur statut d'abonnement
  const boutiquesAvecStatut = boutiques.map((b) => {
    const abo = b.abonnements[0] ?? null
    return {
      id: b.id,
      nom: b.nom,
      solde: b.solde,
      _count: b._count,
      gerant: b.gerant,
      abonnement: abo
        ? { dateFin: abo.dateFin.toISOString(), duree: abo.duree }
        : null,
      abonnementActif: abo !== null
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Mes Boutiques</h1>
        <p className="text-gray-500 mt-1">Gérez vos boutiques</p>
      </div>
      <GestionBoutiques boutiques={boutiquesAvecStatut} />
    </div>
  )
}