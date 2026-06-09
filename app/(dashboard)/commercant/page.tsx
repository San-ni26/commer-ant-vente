// src/app/(dashboard)/commercant/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { TableauDeBordCommercant } from "@/components/dashboard/tableau-de-bord-commercant"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Crown } from "lucide-react"
import Link from "next/link"
import { differenceInDays } from "date-fns"

export default async function PageDashboardCommercant() {
    const session = await auth()

    if (!session?.user) {
        redirect("/connexion")
    }

    // Vérifier et mettre à jour les abonnements expirés
    await prisma.abonnement.updateMany({
        where: {
            commercantId: session.user.id,
            statut: "ACTIF",
            dateFin: { lt: new Date() }
        },
        data: { statut: "EXPIRE" }
    })

    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)

    const demain = new Date(aujourdhui)
    demain.setDate(demain.getDate() + 1)

    // Récupérer l'abonnement actif
    const abonnementActif = await prisma.abonnement.findFirst({
        where: {
            commercantId: session.user.id,
            statut: "ACTIF",
            dateFin: { gte: new Date() }
        },
        orderBy: { dateFin: 'desc' },
        include: { boutique: { select: { nom: true } } }
    })

    // Récupérer les stats
    const [nombreBoutiques, ventesDuJour, totalVentes, soldeTotal, boutiquesRecentes] = await Promise.all([
        prisma.boutique.count({ where: { commercantId: session.user.id } }),
        prisma.vente.aggregate({
            where: {
                boutique: { commercantId: session.user.id },
                dateVente: { gte: aujourdhui, lt: demain }
            },
            _sum: { montant: true }
        }),
        prisma.vente.aggregate({
            where: { boutique: { commercantId: session.user.id } },
            _sum: { montant: true }
        }),
        prisma.boutique.aggregate({
            where: { commercantId: session.user.id },
            _sum: { solde: true }
        }),
        prisma.boutique.findMany({
            where: { commercantId: session.user.id },
            include: {
                _count: { select: { ventes: true, transactions: true, employes: true } },
                gerant: { select: { nom: true, prenom: true } }
            },
            orderBy: { dateCreation: 'desc' },
            take: 5
        })
    ])

    const statistiques = {
        nombreBoutiques,
        ventesDuJour: ventesDuJour._sum.montant || 0,
        totalVentes: totalVentes._sum.montant || 0,
        soldeTotal: soldeTotal._sum.solde || 0,
        boutiquesRecentes: boutiquesRecentes.map(b => ({
            id: b.id,
            nom: b.nom,
            solde: b.solde,
            gerant: b.gerant ? `${b.gerant.prenom || ""} ${b.gerant.nom}` : null,
            nombreVentes: b._count.ventes,
            nombreEmployes: b._count.employes,
        }))
    }

    return (
        <div className="space-y-6">
            {/* Bannière abonnement */}
            <BanniereAbonnement abonnement={abonnementActif} />

            {/* Dashboard */}
            <TableauDeBordCommercant statistiques={statistiques} />
        </div>
    )
}

// Composant bannière abonnement
function BanniereAbonnement({ abonnement }: { abonnement: any }) {
    if (!abonnement) {
        return (
            <Card className="border-red-300 bg-red-50">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-8 w-8 text-red-500 flex-shrink-0" />
                            <div>
                                <h3 className="font-bold text-red-800">Aucun abonnement actif</h3>
                                <p className="text-red-600 text-sm">
                                    Votre accès est limité. Souscrivez à un abonnement pour débloquer toutes les fonctionnalités.
                                </p>
                            </div>
                        </div>
                        <Link href="/abonnement" className="w-full sm:w-auto flex-shrink-0">
                            <Button variant="destructive" className="w-full sm:w-auto">
                                <Crown className="h-4 w-4 mr-2" />
                                Voir les offres
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const joursRestants = differenceInDays(new Date(abonnement.dateFin), new Date())
    const estEssai = abonnement.duree === "ESSAI_7J"

    if (joursRestants <= 3) {
        return (
            <Card className="border-orange-300 bg-orange-50">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-8 w-8 text-orange-500 flex-shrink-0" />
                            <div>
                                <h3 className="font-bold text-orange-800">
                                    {estEssai ? "Période d'essai" : "Abonnement"} - Plus que {joursRestants} jour{joursRestants > 1 ? "s" : ""} !
                                </h3>
                                <p className="text-orange-600 text-sm">
                                    {estEssai
                                        ? "Votre période d'essai expire bientôt. Souscrivez pour continuer."
                                        : "Votre abonnement expire bientôt. Renouvelez-le pour ne pas perdre l'accès."
                                    }
                                </p>
                            </div>
                        </div>
                        <Link href="/abonnement" className="w-full sm:w-auto flex-shrink-0">
                            <Button variant="default" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700">
                                <Crown className="h-4 w-4 mr-2" />
                                {estEssai ? "Souscrire" : "Renouveler"}
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-green-300 bg-green-50">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-800 text-sm">
                    <Crown className="h-4 w-4" />
                    <span>
                        {estEssai ? "Période d'essai" : "Abonnement actif"} - {joursRestants} jour{joursRestants > 1 ? "s" : ""} restants
                    </span>
                    {abonnement.boutique && (
                        <span className="text-green-600">• {abonnement.boutique.nom}</span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}