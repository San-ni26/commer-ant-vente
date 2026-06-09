// src/app/(dashboard)/admin/abonnements/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { GestionAbonnements } from "@/components/admin/gestion-abonnements"

export default async function PageAbonnements() {
    const session = await auth()

    if (!session?.user || (session.user as any).role !== "ADMIN") {
        redirect("/connexion")
    }

    try {
        // Simplifier les requêtes
        const abonnements = await prisma.abonnement.findMany({
            include: {
                boutique: { select: { id: true, nom: true } },
                commercant: { select: { id: true, nom: true, email: true } }
            },
            orderBy: { dateCreation: 'desc' }
        })

        const boutiques = await prisma.boutique.findMany({
            select: { id: true, nom: true, commercantId: true }
        })

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Gestion des Abonnements</h1>
                    <p className="text-gray-500 mt-1">Créez et gérez les abonnements des boutiques</p>
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