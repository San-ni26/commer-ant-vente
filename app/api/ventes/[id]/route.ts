// src/app/api/ventes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json(
                { erreur: "Non authentifié" },
                { status: 401 }
            )
        }

        const { id } = await context.params

        // Récupérer la vente avant de la supprimer pour mettre à jour le solde
        const vente = await prisma.vente.findUnique({
            where: { id },
            include: { boutique: true }
        })

        if (!vente) {
            return NextResponse.json(
                { erreur: "Vente non trouvée" },
                { status: 404 }
            )
        }

        // Vérifier que l'utilisateur a le droit (commerçant propriétaire ou gérant)
        if (vente.boutique.commercantId !== session.user.id &&
            vente.boutique.gerantId !== session.user.id) {
            return NextResponse.json(
                { erreur: "Non autorisé" },
                { status: 403 }
            )
        }

        // Supprimer la vente et mettre à jour le solde
        await prisma.$transaction([
            prisma.vente.delete({ where: { id } }),
            prisma.boutique.update({
                where: { id: vente.boutiqueId },
                data: {
                    solde: {
                        decrement: vente.montant
                    }
                }
            })
        ])

        return NextResponse.json({ message: "Vente supprimée avec succès" })
    } catch (erreur) {
        console.error("Erreur suppression vente:", erreur)
        return NextResponse.json(
            { erreur: "Erreur lors de la suppression" },
            { status: 500 }
        )
    }
}