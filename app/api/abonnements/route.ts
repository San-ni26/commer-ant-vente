// src/app/api/abonnements/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const schemaAbonnement = z.object({
  boutiqueId: z.string(),
  duree: z.enum(["UN_MOIS", "TROIS_MOIS", "SIX_MOIS", "UN_AN"]),
})

const prixAbonnements = {
  UN_MOIS: 5000,
  TROIS_MOIS: 12000,
  SIX_MOIS: 20000,
  UN_AN: 35000,
}

const dureeEnJours: Record<string, number> = {
  UN_MOIS: 30,
  TROIS_MOIS: 90,
  SIX_MOIS: 180,
  UN_AN: 365,
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 })
    }

    const abonnements = await avecRetry(() =>
      prisma.abonnement.findMany({
        include: {
          boutique: { select: { nom: true } },
          commercant: { select: { nom: true, email: true } }
        },
        orderBy: { dateCreation: "desc" }
      })
    )

    return NextResponse.json(abonnements)
  } catch (erreur) {
    console.error("Erreur récupération abonnements:", erreur)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 })
    }

    const corps = await request.json()
    const donnees = schemaAbonnement.parse(corps)

    // Récupérer la boutique pour en extraire le commercantId
    const boutique = await avecRetry(() =>
      prisma.boutique.findUnique({
        where: { id: donnees.boutiqueId },
        select: { commercantId: true }
      })
    )
    if (!boutique) {
      return NextResponse.json({ erreur: "Boutique introuvable" }, { status: 404 })
    }

    const dateDebut = new Date()
    const dateFin = new Date()
    dateFin.setDate(dateFin.getDate() + dureeEnJours[donnees.duree])

    const abonnement = await avecRetry(() =>
      prisma.abonnement.create({
        data: {
          boutiqueId: donnees.boutiqueId,
          commercantId: boutique.commercantId,
          duree: donnees.duree,
          dateDebut,
          dateFin,
          montant: prixAbonnements[donnees.duree as keyof typeof prixAbonnements],
          statut: "ACTIF",
        },
        include: {
          boutique: { select: { nom: true } },
          commercant: { select: { nom: true } }
        }
      })
    )

    return NextResponse.json(abonnement, { status: 201 })
  } catch (erreur) {
    if (erreur instanceof z.ZodError) {
      return NextResponse.json({ erreur: "Données invalides", details: erreur.issues }, { status: 400 })
    }
    console.error("Erreur création abonnement:", erreur)
    return NextResponse.json({ erreur: "Erreur lors de la création de l'abonnement" }, { status: 500 })
  }
}