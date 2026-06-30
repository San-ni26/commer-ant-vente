// app/api/boutiques/[id]/details/route.ts
// Retourne les détails complets d'une boutique pour le mode offline
import { NextRequest, NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
    }

    const { id } = await context.params

    const boutique = await avecRetry(() =>
      prisma.boutique.findFirst({
        where: {
          id,
          OR: [
            { commercantId: session.user.id },
            { gerantId: session.user.id },
          ],
        },
        include: {
          gerant: { select: { id: true, nom: true, prenom: true, email: true } },
          employes: {
            select: { id: true, nom: true, prenom: true, telephone: true, code: true },
          },
          _count: { select: { ventes: true, transactions: true } },
        },
      })
    )

    if (!boutique) {
      return NextResponse.json({ erreur: "Boutique non trouvée" }, { status: 404 })
    }

    return NextResponse.json({
      ...boutique,
      gerant: boutique.gerant
        ? { ...boutique.gerant, prenom: boutique.gerant.prenom || "" }
        : undefined,
      employes: boutique.employes.map((e) => ({
        ...e,
        prenom: e.prenom || "",
      })),
    }, {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (err) {
    console.error("[API] /boutiques/[id]/details:", err)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}
