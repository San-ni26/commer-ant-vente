// src/lib/abonnement.ts
import { prisma } from "./prisma"

/**
 * Vérifie si une boutique a un abonnement actif
 */
export async function verifierAbonnementActif(boutiqueId: string): Promise<boolean> {
    const abonnement = await prisma.abonnement.findFirst({
        where: {
            boutiqueId,
            statut: "ACTIF",
            dateFin: { gte: new Date() }
        },
        orderBy: { dateFin: 'desc' }
    })

    return !!abonnement
}

/**
 * Récupère l'abonnement actif d'une boutique
 */
export async function getAbonnementActif(boutiqueId: string) {
    return prisma.abonnement.findFirst({
        where: {
            boutiqueId,
            statut: "ACTIF",
            dateFin: { gte: new Date() }
        },
        orderBy: { dateFin: 'desc' }
    })
}

/**
 * Vérifie et met à jour les abonnements expirés
 */
export async function verifierEtMettreAJourAbonnements() {
    const maintenant = new Date()

    // Mettre à jour les abonnements expirés
    await prisma.abonnement.updateMany({
        where: {
            statut: "ACTIF",
            dateFin: { lt: maintenant }
        },
        data: {
            statut: "EXPIRE"
        }
    })
}

/**
 * Vérifie si l'utilisateur peut accéder à la boutique
 */
export async function peutAccederBoutique(boutiqueId: string): Promise<{
    autorise: boolean
    raison?: string
    abonnement?: any
}> {
    const abonnement = await getAbonnementActif(boutiqueId)

    if (!abonnement) {
        return {
            autorise: false,
            raison: "Aucun abonnement actif. Veuillez souscrire à un abonnement."
        }
    }

    return {
        autorise: true,
        abonnement
    }
}