// src/app/api/abonnements/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const schemaAbonnement = z.object({
  boutiqueId: z.string(),
  duree: z.enum(["UN_MOIS", "TROIS_MOIS", "SIX_MOIS", "UN_AN"]),
})

const prixAbonnements = {
  UN_MOIS: 9.99,
  TROIS_MOIS: 24.99,
  SIX_MOIS: 44.99,
  UN_AN: 79.99,
}

const dureeEnMois = {
  UN_MOIS: 1,
  TROIS_MOIS: 3,
  SIX_MOIS: 6,
  UN_AN: 12,
}

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { erreur: "Non autorisé" },
        { status: 403 }
      )
    }

    const abonnements = await prisma.abonnement.findMany({
      include: {
        boutique: {
          select: {
            nom: true,
          }
        }
      },
      orderBy: {
        dateCreation: 'desc'
      }
    })

    return NextResponse.json(abonnements)
  } catch (erreur) {
    console.error("Erreur lors de la récupération des abonnements:", erreur)
    return NextResponse.json(
      { erreur: "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { erreur: "Non autorisé" },
        { status: 403 }
      )
    }

    const corps = await request.json()
    const donnees = schemaAbonnement.parse(corps)

    const dateDebut = new Date()
    const dateFin = new Date()
    dateFin.setMonth(dateFin.getMonth() + dureeEnMois[donnees.duree])

    const abonnement = await prisma.abonnement.create({
      data: {
        boutiqueId: donnees.boutiqueId,
        commercantId: session.user.id,
        duree: donnees.duree,
        dateDebut,
        dateFin,
        montant: prixAbonnements[donnees.duree],
        statut: "ACTIF",
      },
      include: {
        boutique: {
          select: {
            nom: true,
          }
        }
      }
    })

    return NextResponse.json(abonnement, { status: 201 })
  } catch (erreur) {
    if (erreur instanceof z.ZodError) {
      return NextResponse.json(
        { 
          erreur: "Données invalides", 
          details: erreur.issues  // Corrigé ici
        },
        { status: 400 }
      )
    }
    
    console.error("Erreur lors de la création de l'abonnement:", erreur)
    return NextResponse.json(
      { erreur: "Erreur lors de la création de l'abonnement" },
      { status: 500 }
    )
  }
}