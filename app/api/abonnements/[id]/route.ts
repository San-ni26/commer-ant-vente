// src/app/api/abonnements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// PATCH /api/abonnements/[id] — Révoquer (annuler) un abonnement
export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 })
    }

    const { id } = await context.params

    const abonnement = await avecRetry(() =>
      prisma.abonnement.update({
        where: { id },
        data: { statut: "ANNULE" },
        include: {
          boutique: { select: { nom: true } },
          commercant: { select: { nom: true } }
        }
      })
    )

    return NextResponse.json(abonnement)
  } catch (erreur) {
    console.error("Erreur révocation abonnement:", erreur)
    return NextResponse.json({ erreur: "Erreur lors de la révocation" }, { status: 500 })
  }
}
