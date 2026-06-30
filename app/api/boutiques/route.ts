// src/app/api/boutiques/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
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

    // Expirer les abonnements dépassés
    await avecRetry(() =>
      prisma.abonnement.updateMany({
        where: {
          commercantId: session.user.id,
          statut: "ACTIF",
          dateFin: { lt: new Date() },
        },
        data: { statut: "EXPIRE" },
      })
    )

    const boutiques = await avecRetry(() =>
      prisma.boutique.findMany({
        where: { commercantId: session.user.id },
        include: {
          _count: { select: { ventes: true, employes: true } },
          gerant: { select: { id: true, nom: true, prenom: true, email: true } },
          abonnements: {
            where: { statut: "ACTIF", dateFin: { gte: new Date() } },
            orderBy: { dateFin: "desc" },
            take: 1,
            select: { id: true, dateFin: true, duree: true, statut: true },
          },
        },
        orderBy: { dateCreation: 'desc' }
      })
    )

    const boutiquesAvecStatut = boutiques.map((b) => {
      const abo = b.abonnements[0] ?? null
      return {
        id: b.id,
        nom: b.nom,
        solde: b.solde,
        gerantId: b.gerantId,
        dateCreation: b.dateCreation,
        gerant: b.gerant,
        _count: b._count,
        abonnement: abo ? { dateFin: abo.dateFin.toISOString(), duree: abo.duree } : null,
        abonnementActif: abo !== null,
      }
    })

    return NextResponse.json(boutiquesAvecStatut, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    })
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