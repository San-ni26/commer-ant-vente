// app/api/employe/ventes/route.ts
// API pour les données de la page ventes employé
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
    }

    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)
    const demain = new Date(aujourdhui)
    demain.setDate(demain.getDate() + 1)
    const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1)

    const [employe, ventesDuJour, mesVentesMois] = await Promise.all([
      prisma.employe.findUnique({
        where: { id: session.user.id },
        include: {
          boutique: {
            select: { id: true, nom: true, solde: true },
          },
        },
      }),
      prisma.vente.findMany({
        where: {
          boutique: { employes: { some: { id: session.user.id } } },
          dateVente: { gte: aujourdhui, lt: demain },
        },
        orderBy: { dateVente: "desc" },
        include: {
          enregistrePar: { select: { nom: true, prenom: true } },
        },
        take: 100,
      }),
      prisma.vente.aggregate({
        where: {
          boutique: { employes: { some: { id: session.user.id } } },
          enregistreParId: session.user.id,
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
      mesVentesMoisTotal: mesVentesMois._sum.montant || 0,
    })
  } catch (err) {
    console.error("[API] /employe/ventes:", err)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}
