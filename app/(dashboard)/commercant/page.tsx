// src/app/(dashboard)/commercant/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma, avecRetry } from "@/lib/prisma"
import { TableauDeBordCommercant } from "@/components/dashboard/tableau-de-bord-commercant"

export default async function PageDashboardCommercant() {
    const session = await auth()

    if (!session?.user) {
        redirect("/connexion")
    }

    // 1. Expirer les abonnements dépassés
    await avecRetry(() =>
        prisma.abonnement.updateMany({
            where: {
                commercantId: session.user.id,
                statut: "ACTIF",
                dateFin: { lt: new Date() }
            },
            data: { statut: "EXPIRE" }
        })
    )

    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)
    const demain = new Date(aujourdhui)
    demain.setDate(demain.getDate() + 1)

    // 2. Récupérer toutes les boutiques du commerçant avec leur abonnement actif
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
                        select: { id: true, dateFin: true, duree: true, statut: true }
                    }
                },
                orderBy: { dateCreation: "desc" }
            })
        ),
        avecRetry(() =>
            prisma.vente.aggregate({
                where: {
                    boutique: { commercantId: session.user.id },
                    dateVente: { gte: aujourdhui, lt: demain }
                },
                _sum: { montant: true }
            })
        ),
        avecRetry(() =>
            prisma.vente.aggregate({
                where: { boutique: { commercantId: session.user.id } },
                _sum: { montant: true }
            })
        ),
        avecRetry(() =>
            prisma.boutique.aggregate({
                where: { commercantId: session.user.id },
                _sum: { solde: true }
            })
        )
    ])

    // 3. Calculer les métriques d'abonnement
    const boutiquesAvecStatut = boutiques.map(b => {
        const abo = b.abonnements[0] ?? null
        return {
            id: b.id,
            nom: b.nom,
            solde: b.solde,
            gerant: b.gerant ? `${b.gerant.prenom || ""} ${b.gerant.nom}`.trim() : null,
            nombreVentes: b._count.ventes,
            nombreEmployes: b._count.employes,
            abonnement: abo
                ? { dateFin: abo.dateFin.toISOString(), duree: abo.duree }
                : null,
            abonnementActif: abo !== null
        }
    })

    const nombreBoutiquesBloquees = boutiquesAvecStatut.filter(b => !b.abonnementActif).length

    const statistiques = {
        nombreBoutiques: boutiques.length,
        nombreBoutiquesBloquees,
        ventesDuJour: ventesDuJour._sum.montant || 0,
        totalVentes: totalVentes._sum.montant || 0,
        soldeTotal: soldeTotal._sum.solde || 0,
        boutiquesRecentes: boutiquesAvecStatut.slice(0, 5)
    }

    return (
        <div className="space-y-6">
            <TableauDeBordCommercant statistiques={statistiques} />
        </div>
    )
}