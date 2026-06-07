// src/app/api/boutiques/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const schemaBoutique = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  gerantId: z.string().optional(),
})

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { erreur: "Non authentifié" },
        { status: 401 }
      )
    }

    const boutiques = await prisma.boutique.findMany({
      where: {
        commercantId: session.user.id
      },
      include: {
        gerant: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          }
        },
        _count: {
          select: {
            ventes: true,
            transactions: true,
            employes: true,
          }
        }
      },
      orderBy: {
        dateCreation: 'desc'
      }
    })

    return NextResponse.json(boutiques)
  } catch (erreur) {
    console.error("Erreur lors de la récupération des boutiques:", erreur)
    return NextResponse.json(
      { erreur: "Erreur lors de la récupération des boutiques" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { erreur: "Non authentifié" },
        { status: 401 }
      )
    }

    const corps = await request.json()
    const donneesValidees = schemaBoutique.parse(corps)

    const boutique = await prisma.boutique.create({
      data: {
        nom: donneesValidees.nom,
        commercantId: session.user.id,
        ...(donneesValidees.gerantId && {
          gerantId: donneesValidees.gerantId
        })
      },
      include: {
        gerant: {
          select: {
            id: true,
            nom: true,
            prenom: true,
          }
        }
      }
    })

    return NextResponse.json(boutique, { status: 201 })
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
    
    console.error("Erreur lors de la création de la boutique:", erreur)
    return NextResponse.json(
      { erreur: "Erreur lors de la création de la boutique" },
      { status: 500 }
    )
  }
}