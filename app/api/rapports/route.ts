// app/api/rapports/route.ts
// API endpoint pour les rapports analytiques du commerçant
import { NextRequest, NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "COMMERCANT") {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const boutiqueId = searchParams.get("boutiqueId") || "all"
    const periode = searchParams.get("periode") || "7j"

    // 1. Récupérer toutes les boutiques du commerçant pour le filtre
    const boutiques = await avecRetry(() =>
      prisma.boutique.findMany({
        where: { commercantId: session.user.id },
        select: { id: true, nom: true },
        orderBy: { nom: "asc" },
      })
    )

    // 2. Définir les filtres de date en fonction de la période
    const maintenant = new Date()
    let dateDebut: Date | undefined = undefined

    if (periode === "7j") {
      dateDebut = new Date(maintenant)
      dateDebut.setDate(maintenant.getDate() - 7)
      dateDebut.setHours(0, 0, 0, 0)
    } else if (periode === "30j") {
      dateDebut = new Date(maintenant)
      dateDebut.setDate(maintenant.getDate() - 30)
      dateDebut.setHours(0, 0, 0, 0)
    }

    // 3. Construire la clause conditionnelle
    const buildWhereClause = (baseWhere: Record<string, unknown>) => {
      const where: Record<string, unknown> = { ...baseWhere }
      if (boutiqueId !== "all") {
        where.boutiqueId = boutiqueId
      } else {
        where.boutique = { commercantId: session.user.id }
      }
      if (dateDebut) {
        where.dateVente = { gte: dateDebut }
      }
      return where
    }

    const buildTransactionWhereClause = (baseWhere: Record<string, unknown>) => {
      const where: Record<string, unknown> = { ...baseWhere }
      if (boutiqueId !== "all") {
        where.boutiqueId = boutiqueId
      } else {
        where.boutique = { commercantId: session.user.id }
      }
      if (dateDebut) {
        where.dateTransaction = { gte: dateDebut }
      }
      return where
    }

    // 4. Exécuter les requêtes Prisma
    const [ventesAggregate, ventes, totalDepenses, totalVersements] = await Promise.all([
      avecRetry(() =>
        prisma.vente.aggregate({
          where: buildWhereClause({}),
          _sum: { montant: true },
          _count: { id: true },
        })
      ),
      avecRetry(() =>
        prisma.vente.findMany({
          where: buildWhereClause({}),
          include: {
            boutique: { select: { id: true, nom: true } },
            enregistrePar: { select: { nom: true, prenom: true } },
          },
          orderBy: { dateVente: "desc" },
        })
      ),
      avecRetry(() =>
        prisma.transaction.aggregate({
          where: buildTransactionWhereClause({
            type: { in: ["DEPENSE", "RETRAIT"] },
          }),
          _sum: { montant: true },
        })
      ),
      avecRetry(() =>
        prisma.transaction.aggregate({
          where: buildTransactionWhereClause({
            type: { in: ["VERSEMENT", "VENTE", "VIREMENT_BANCAIRE"] },
          }),
          _sum: { montant: true },
        })
      ),
    ])

    const totalVentes = ventesAggregate._sum.montant || 0
    const nombreVentes = ventesAggregate._count.id || 0
    const panierMoyen = nombreVentes > 0 ? totalVentes / nombreVentes : 0

    // 5. Calculer l'évolution journalière ou mensuelle
    let ventesParJour: Array<{ date: string; montant: number }> = []

    if (periode === "7j" || periode === "30j") {
      const nbJours = periode === "7j" ? 7 : 30
      const mapJours = new Map<string, number>()

      for (let i = nbJours - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(maintenant.getDate() - i)
        const dateKey = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
        mapJours.set(dateKey, 0)
      }

      ventes.forEach((v) => {
        const dateKey = new Date(v.dateVente).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        })
        if (mapJours.has(dateKey)) {
          mapJours.set(dateKey, (mapJours.get(dateKey) || 0) + v.montant)
        }
      })

      ventesParJour = Array.from(mapJours.entries()).map(([date, montant]) => ({
        date,
        montant,
      }))
    } else {
      const mapMois = new Map<string, number>()
      const ventesChronologiques = [...ventes].reverse()

      ventesChronologiques.forEach((v) => {
        const dateKey = new Date(v.dateVente).toLocaleDateString("fr-FR", {
          month: "short",
          year: "2-digit",
        })
        mapMois.set(dateKey, (mapMois.get(dateKey) || 0) + v.montant)
      })

      ventesParJour = Array.from(mapMois.entries()).map(([date, montant]) => ({
        date,
        montant,
      }))

      if (ventesParJour.length === 0) {
        const moisCourant = maintenant.toLocaleDateString("fr-FR", {
          month: "short",
          year: "2-digit",
        })
        ventesParJour = [{ date: moisCourant, montant: 0 }]
      }
    }

    // 6. Ventilation par boutique
    const mapBoutiques = new Map<string, { nom: string; montant: number }>()
    boutiques.forEach((b) => {
      mapBoutiques.set(b.id, { nom: b.nom, montant: 0 })
    })
    ventes.forEach((v) => {
      const bData = mapBoutiques.get(v.boutiqueId)
      if (bData) {
        mapBoutiques.set(v.boutiqueId, {
          nom: bData.nom,
          montant: bData.montant + v.montant,
        })
      }
    })

    const ventesParBoutique = Array.from(mapBoutiques.entries())
      .map(([id, data]) => ({
        id,
        nom: data.nom,
        montant: data.montant,
        pourcentage: totalVentes > 0 ? (data.montant / totalVentes) * 100 : 0,
      }))
      .sort((a, b) => b.montant - a.montant)

    // 7. Répartition par employé
    const mapEmployes = new Map<string, { nom: string; prenom: string | null; montant: number }>()
    ventes.forEach((v) => {
      const key = v.enregistreParId
      const eData = mapEmployes.get(key)
      if (eData) {
        mapEmployes.set(key, { ...eData, montant: eData.montant + v.montant })
      } else {
        mapEmployes.set(key, {
          nom: v.enregistrePar.nom,
          prenom: v.enregistrePar.prenom,
          montant: v.montant,
        })
      }
    })

    const ventesParEmploye = Array.from(mapEmployes.values())
      .map((data) => ({
        nom: data.nom,
        prenom: data.prenom,
        montant: data.montant,
        pourcentage: totalVentes > 0 ? (data.montant / totalVentes) * 100 : 0,
      }))
      .sort((a, b) => b.montant - a.montant)

    // 8. Ventes récentes
    const ventesRecentes = ventes.slice(0, 8).map((v) => ({
      id: v.id,
      montant: v.montant,
      description: v.description,
      dateVente: v.dateVente.toISOString(),
      boutique: { nom: v.boutique.nom },
      enregistrePar: { nom: v.enregistrePar.nom, prenom: v.enregistrePar.prenom },
    }))

    return NextResponse.json({
      boutiques,
      filtres: { boutiqueId, periode },
      stats: {
        totalVentes,
        nombreVentes,
        panierMoyen,
        totalDepenses: totalDepenses._sum.montant || 0,
        totalVersements: totalVersements._sum.montant || 0,
        ventesParJour,
        ventesParBoutique,
        ventesParEmploye,
        ventesRecentes,
      },
    })
  } catch (erreur) {
    console.error("[API] /rapports:", erreur)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}
