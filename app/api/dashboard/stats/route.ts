// app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
    }

    const aujourd = new Date()
    aujourd.setHours(0, 0, 0, 0)
    const demain = new Date(aujourd)
    demain.setDate(demain.getDate() + 1)

    // Expirer les abonnements dépassés
    await avecRetry(() =>
      prisma.abonnement.updateMany({
        where: {
          commercantId: session.user.id,
          statut: "ACTIF",
          dateFin: { lt: new Date() },
        },
        data: { statut: "EXPIRE" },
      })
    )

    const [boutiques, ventesDuJour, totalVentes, soldeTotal] = await Promise.all([
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
              select: { id: true, dateFin: true, duree: true, statut: true },
            },
          },
          orderBy: { dateCreation: "desc" },
        })
      ),
      avecRetry(() =>
        prisma.vente.aggregate({
          where: {
            boutique: { commercantId: session.user.id },
            dateVente: { gte: aujourd, lt: demain },
          },
          _sum: { montant: true },
        })
      ),
      avecRetry(() =>
        prisma.vente.aggregate({
          where: { boutique: { commercantId: session.user.id } },
          _sum: { montant: true },
        })
      ),
      avecRetry(() =>
        prisma.boutique.aggregate({
          where: { commercantId: session.user.id },
          _sum: { solde: true },
        })
      ),
    ])

    const boutiquesAvecStatut = boutiques.map((b) => {
      const abo = b.abonnements[0] ?? null
      return {
        id: b.id,
        nom: b.nom,
        solde: b.solde,
        gerant: b.gerant ? `${b.gerant.prenom || ""} ${b.gerant.nom}`.trim() : null,
        nombreVentes: b._count.ventes,
        nombreEmployes: b._count.employes,
        abonnement: abo ? { dateFin: abo.dateFin.toISOString(), duree: abo.duree } : null,
        abonnementActif: abo !== null,
      }
    })

    return NextResponse.json({
      nombreBoutiques: boutiques.length,
      nombreBoutiquesBloquees: boutiquesAvecStatut.filter((b) => !b.abonnementActif).length,
      ventesDuJour: ventesDuJour._sum.montant || 0,
      totalVentes: totalVentes._sum.montant || 0,
      soldeTotal: soldeTotal._sum.solde || 0,
      boutiquesRecentes: boutiquesAvecStatut.slice(0, 5),
    }, {
      headers: { "Cache-Control": "private, no-store" }
    })
  } catch (err) {
    console.error("[API] /dashboard/stats:", err)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}
