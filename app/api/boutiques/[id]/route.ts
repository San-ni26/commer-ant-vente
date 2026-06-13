// src/app/api/boutiques/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
import { auth } from "@/lib/auth"

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

    const boutique = await avecRetry(() =>
      prisma.boutique.findFirst({
        where: {
          id: id,
          OR: [
            { commercantId: session.user.id },
            { gerantId: session.user.id }
          ]
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
          employes: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true,
              code: true,
            }
          },
          _count: {
            select: {
              ventes: true,
              transactions: true,
            }
          }
        }
      })
    )

    if (!boutique) {
      return NextResponse.json(
        { erreur: "Boutique non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json(boutique)
  } catch (erreur) {
    console.error("Erreur lors de la récupération de la boutique:", erreur)
    return NextResponse.json(
      { erreur: "Erreur lors de la récupération de la boutique" },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Vérifier que la boutique appartient au commercant
    const boutique = await avecRetry(() =>
      prisma.boutique.findFirst({
        where: {
          id: id,
          commercantId: session.user.id
        }
      })
    )

    if (!boutique) {
      return NextResponse.json(
        { erreur: "Boutique non trouvée ou accès non autorisé" },
        { status: 404 }
      )
    }

    const boutiqueMaj = await avecRetry(() =>
      prisma.boutique.update({
        where: { id: id },
        data: {
          nom: corps.nom,
          gerantId: corps.gerantId,
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
    )

    return NextResponse.json(boutiqueMaj)
  } catch (erreur) {
    console.error("Erreur lors de la mise à jour de la boutique:", erreur)
    return NextResponse.json(
      { erreur: "Erreur lors de la mise à jour de la boutique" },
      { status: 500 }
    )
  }
}

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

    await avecRetry(() =>
      prisma.boutique.delete({
        where: {
          id: id,
          commercantId: session.user.id
        }
      })
    )

    return NextResponse.json({ message: "Boutique supprimée" })
  } catch (erreur) {
    console.error("Erreur lors de la suppression de la boutique:", erreur)
    return NextResponse.json(
      { erreur: "Erreur lors de la suppression de la boutique" },
      { status: 500 }
    )
  }
}