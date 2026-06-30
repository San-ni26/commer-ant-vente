// app/api/admin/boutiques/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 })
    }

    const boutiques = await avecRetry(() =>
      prisma.boutique.findMany({
        include: {
          commercant: {
            select: {
              id: true,
              nom: true,
              email: true,
              emailVerifie: true,
            },
          },
          _count: {
            select: {
              ventes: true,
              employes: true,
              transactions: true,
            },
          },
          abonnements: {
            where: { statut: "ACTIF" },
            select: { dateFin: true, duree: true },
          },
        },
        orderBy: { dateCreation: "desc" },
      })
    )

    return NextResponse.json(boutiques)
  } catch (err) {
    console.error("[Admin API GET boutiques]", err)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 })
    }

    const corps = await request.json()
    const { userId, emailVerifie } = corps

    if (!userId) {
      return NextResponse.json({ erreur: "ID utilisateur manquant" }, { status: 400 })
    }

    const utilisateurMaj = await avecRetry(() =>
      prisma.utilisateur.update({
        where: { id: userId },
        data: { emailVerifie: !!emailVerifie },
      })
    )

    return NextResponse.json({ message: "Statut email mis à jour", utilisateur: utilisateurMaj })
  } catch (err) {
    console.error("[Admin API PATCH boutiques]", err)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ erreur: "ID boutique manquant" }, { status: 400 })
    }

    await avecRetry(() =>
      prisma.$transaction([
        prisma.abonnement.deleteMany({ where: { boutiqueId: id } }),
        prisma.vente.deleteMany({ where: { boutiqueId: id } }),
        prisma.transaction.deleteMany({ where: { boutiqueId: id } }),
        prisma.employe.deleteMany({ where: { boutiqueId: id } }),
        prisma.boutique.delete({ where: { id } }),
      ])
    )

    return NextResponse.json({ message: "Boutique et toutes les données associées supprimées avec succès" })
  } catch (err) {
    console.error("[Admin API DELETE boutique]", err)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}
