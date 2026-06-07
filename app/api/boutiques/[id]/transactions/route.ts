// src/app/api/boutiques/[id]/transactions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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

    const transactions = await prisma.transaction.findMany({
      where: {
        boutiqueId: id,
      },
      include: {
        verifieePar: {
          select: {
            nom: true,
            prenom: true,
          }
        }
      },
      orderBy: {
        dateTransaction: 'desc'
      }
    })

    return NextResponse.json(transactions)
  } catch (erreur) {
    console.error("Erreur lors de la récupération des transactions:", erreur)
    return NextResponse.json(
      { erreur: "Erreur lors de la récupération des transactions" },
      { status: 500 }
    )
  }
}