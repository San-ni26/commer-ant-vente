// src/app/api/boutiques/[id]/ventes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const schemaVente = z.object({
  montant: z.number().positive("Le montant doit être positif"),
  description: z.string().optional(),
  dateVente: z.string().datetime().optional(),
})

export async function GET(
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
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    
    const ventes = await prisma.vente.findMany({
      where: {
        boutiqueId: id,
        ...(date && {
          dateVente: {
            gte: new Date(date),
            lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
          }
        })
      },
      include: {
        enregistrePar: {
          select: {
            nom: true,
            prenom: true,
          }
        }
      },
      orderBy: {
        dateVente: 'desc'
      }
    })

    return NextResponse.json(ventes)
  } catch (erreur) {
    console.error("Erreur lors de la récupération des ventes:", erreur)
    return NextResponse.json(
      { erreur: "Erreur lors de la récupération des ventes" },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const corps = await request.json()
    const donneesValidees = schemaVente.parse(corps)

    const boutique = await prisma.boutique.findFirst({
      where: {
        id: id,
        OR: [
          { commercantId: session.user.id },
          { gerantId: session.user.id }
        ]
      }
    })

    if (!boutique) {
      return NextResponse.json(
        { erreur: "Boutique non trouvée ou accès non autorisé" },
        { status: 404 }
      )
    }

    const [vente] = await prisma.$transaction([
      prisma.vente.create({
        data: {
          montant: donneesValidees.montant,
          description: donneesValidees.description,
          boutiqueId: id,
          enregistreParId: session.user.id,
          dateVente: donneesValidees.dateVente 
            ? new Date(donneesValidees.dateVente)
            : new Date(),
        },
        include: {
          enregistrePar: {
            select: {
              nom: true,
              prenom: true,
            }
          }
        }
      }),
      prisma.boutique.update({
        where: { id: id },
        data: {
          solde: {
            increment: donneesValidees.montant
          }
        }
      })
    ])

    return NextResponse.json(vente, { status: 201 })
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
    
    console.error("Erreur lors de la création de la vente:", erreur)
    return NextResponse.json(
      { erreur: "Erreur lors de la création de la vente" },
      { status: 500 }
    )
  }
}