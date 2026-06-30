// app/api/employe/dashboard/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periode = searchParams.get("periode") || "jour"

    const aujourd = new Date()
    aujourd.setHours(0, 0, 0, 0)
    const demain = new Date(aujourd)
    demain.setDate(demain.getDate() + 1)
    const debutMois = new Date(aujourd.getFullYear(), aujourd.getMonth(), 1)

    let dateDebut = aujourd
    if (periode === "semaine") {
      const day = aujourd.getDay()
      const diff = aujourd.getDate() - day + (day === 0 ? -6 : 1)
      dateDebut = new Date(aujourd)
      dateDebut.setDate(diff)
      dateDebut.setHours(0, 0, 0, 0)
    } else if (periode === "mois") {
      dateDebut = debutMois
    } else if (periode === "annee") {
      dateDebut = new Date(aujourd.getFullYear(), 0, 1)
    }

    const [employe, ventesDuJour, ventesMois] = await Promise.all([
      prisma.employe.findUnique({
        where: { id: session.user.id },
        include: {
          boutique: { select: { id: true, nom: true, solde: true } },
        },
      }),
      prisma.vente.findMany({
        where: {
          boutique: { employes: { some: { id: session.user.id } } },
          dateVente: { gte: dateDebut, lt: demain },
        },
        orderBy: { dateVente: "desc" },
        include: { enregistrePar: { select: { nom: true, prenom: true } } },
        take: 100,
      }),
      prisma.vente.aggregate({
        where: {
          boutique: { employes: { some: { id: session.user.id } } },
          dateVente: { gte: debutMois },
        },
        _sum: { montant: true },
      }),
    ])

    return NextResponse.json({
      employe: employe
        ? {
            id: employe.id,
            nom: employe.nom,
            prenom: employe.prenom,
            boutique: employe.boutique,
          }
        : null,
      ventesDuJour: ventesDuJour.map((v) => ({
        id: v.id,
        montant: v.montant,
        description: v.description,
        dateVente: v.dateVente.toISOString(),
        enregistrePar: v.enregistrePar,
      })),
      ventesMoisTotal: ventesMois._sum.montant || 0,
    }, {
      headers: { "Cache-Control": "private, no-store" }
    })
  } catch (err) {
    console.error("[API] /employe/dashboard:", err)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}
