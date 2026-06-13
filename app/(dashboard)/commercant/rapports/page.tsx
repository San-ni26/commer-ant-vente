// src/app/(dashboard)/commercant/rapports/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma, avecRetry } from "@/lib/prisma"
import { RapportsCommercantClient } from "@/components/dashboard/commercant/rapports-client"

interface PageRapportsProps {
  searchParams: Promise<{
    boutiqueId?: string
    periode?: string
  }>
}

export default async function PageRapports({ searchParams }: PageRapportsProps) {
  const session = await auth()

  if (!session?.user || session.user.role !== "COMMERCANT") {
    redirect("/connexion")
  }

  // Await search parameters (Next.js 15+ breaking change)
  const queryParams = await searchParams
  const boutiqueId = queryParams.boutiqueId || "all"
  const periode = queryParams.periode || "7j"

  // 1. Récupérer toutes les boutiques du commerçant pour le filtre
  const boutiques = await avecRetry(() =>
    prisma.boutique.findMany({
      where: { commercantId: session.user.id },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" }
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

  // 3. Construire la clause conditionnelle pour les requêtes
  const buildWhereClause = (baseWhere: any) => {
    const where = { ...baseWhere }
    
    // Filtrer par boutique sélectionnée ou restreindre aux boutiques du commerçant
    if (boutiqueId !== "all") {
      where.boutiqueId = boutiqueId
    } else {
      where.boutique = { commercantId: session.user.id }
    }

    // Filtrer par date
    if (dateDebut) {
      where.dateVente = { gte: dateDebut }
    }

    return where
  }

  const buildTransactionWhereClause = (baseWhere: any) => {
    const where = { ...baseWhere }
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

  // 4. Exécuter les requêtes Prisma complexes avec retry automatique
  const [ventesAggregate, ventes, totalDepenses, totalVersements] = await Promise.all([
    // Agrégation principale des ventes
    avecRetry(() =>
      prisma.vente.aggregate({
        where: buildWhereClause({}),
        _sum: { montant: true },
        _count: { id: true }
      })
    ),
    // Liste des ventes détaillées pour calculs de graphiques et ventilation
    avecRetry(() =>
      prisma.vente.findMany({
        where: buildWhereClause({}),
        include: {
          boutique: { select: { id: true, nom: true } },
          enregistrePar: { select: { nom: true, prenom: true } }
        },
        orderBy: { dateVente: "desc" }
      })
    ),
    // Somme des dépenses sur la période
    avecRetry(() =>
      prisma.transaction.aggregate({
        where: buildTransactionWhereClause({
          type: { in: ["DEPENSE", "RETRAIT"] }
        }),
        _sum: { montant: true }
      })
    ),
    // Somme des versements / ventes enregistrés en transaction
    avecRetry(() =>
      prisma.transaction.aggregate({
        where: buildTransactionWhereClause({
          type: { in: ["VERSEMENT", "VENTE", "VIREMENT_BANCAIRE"] }
        }),
        _sum: { montant: true }
      })
    )
  ])

  const totalVentes = ventesAggregate._sum.montant || 0
  const nombreVentes = ventesAggregate._count.id || 0
  const panierMoyen = nombreVentes > 0 ? totalVentes / nombreVentes : 0

  // 5. Calculer l'évolution journalière ou mensuelle du chiffre d'affaires
  let ventesParJour: Array<{ date: string; montant: number }> = []

  if (periode === "7j" || periode === "30j") {
    // Générer toutes les dates dans la plage pour inclure les jours à 0 vente
    const nbJours = periode === "7j" ? 7 : 30
    const mapJours = new Map<string, number>()
    
    for (let i = nbJours - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(maintenant.getDate() - i)
      const dateKey = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      mapJours.set(dateKey, 0)
    }

    // Remplir avec les ventes réelles
    ventes.forEach((v) => {
      const dateKey = new Date(v.dateVente).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      if (mapJours.has(dateKey)) {
        mapJours.set(dateKey, (mapJours.get(dateKey) || 0) + v.montant)
      }
    })

    // Convertir en tableau pour le graphique
    ventesParJour = Array.from(mapJours.entries()).map(([date, montant]) => ({
      date,
      montant
    }))
  } else {
    // Mode Global (Tout le temps) -> Regrouper par mois
    const mapMois = new Map<string, number>()
    
    // Récupérer les ventes triées par date croissante pour générer les mois
    const ventesChronologiques = [...ventes].reverse()
    
    ventesChronologiques.forEach((v) => {
      const dateKey = new Date(v.dateVente).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
      mapMois.set(dateKey, (mapMois.get(dateKey) || 0) + v.montant)
    })

    ventesParJour = Array.from(mapMois.entries()).map(([date, montant]) => ({
      date,
      montant
    }))

    // S'il n'y a pas assez de mois pour afficher une courbe, on ajoute des valeurs fictives ou on limite
    if (ventesParJour.length === 0) {
      const moisCourant = maintenant.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
      ventesParJour = [{ date: moisCourant, montant: 0 }]
    }
  }

  // 6. Calculer la ventilation des ventes par boutique
  const mapBoutiques = new Map<string, { nom: string; montant: number }>()
  
  // Initialiser toutes les boutiques avec 0 vente
  boutiques.forEach((b) => {
    mapBoutiques.set(b.id, { nom: b.nom, montant: 0 })
  })

  // Ajouter les montants réels
  ventes.forEach((v) => {
    const bData = mapBoutiques.get(v.boutiqueId)
    if (bData) {
      mapBoutiques.set(v.boutiqueId, {
        nom: bData.nom,
        montant: bData.montant + v.montant
      })
    }
  })

  const ventesParBoutique = Array.from(mapBoutiques.entries())
    .map(([id, data]) => ({
      id,
      nom: data.nom,
      montant: data.montant,
      pourcentage: totalVentes > 0 ? (data.montant / totalVentes) * 100 : 0
    }))
    .sort((a, b) => b.montant - a.montant)

  // 7. Calculer la répartition par employé
  const mapEmployes = new Map<string, { nom: string; prenom: string | null; montant: number }>()

  ventes.forEach((v) => {
    const key = v.enregistreParId
    const eData = mapEmployes.get(key)
    if (eData) {
      mapEmployes.set(key, {
        ...eData,
        montant: eData.montant + v.montant
      })
    } else {
      mapEmployes.set(key, {
        nom: v.enregistrePar.nom,
        prenom: v.enregistrePar.prenom,
        montant: v.montant
      })
    }
  })

  const ventesParEmploye = Array.from(mapEmployes.values())
    .map((data) => ({
      nom: data.nom,
      prenom: data.prenom,
      montant: data.montant,
      pourcentage: totalVentes > 0 ? (data.montant / totalVentes) * 100 : 0
    }))
    .sort((a, b) => b.montant - a.montant)

  // 8. Préparer les ventes récentes (limité à 8)
  const ventesRecentes = ventes.slice(0, 8).map((v) => ({
    id: v.id,
    montant: v.montant,
    description: v.description,
    dateVente: v.dateVente.toISOString(),
    boutique: { nom: v.boutique.nom },
    enregistrePar: { nom: v.enregistrePar.nom, prenom: v.enregistrePar.prenom }
  }))

  const stats = {
    totalVentes,
    nombreVentes,
    panierMoyen,
    totalDepenses: totalDepenses._sum.montant || 0,
    totalVersements: totalVersements._sum.montant || 0,
    ventesParJour,
    ventesParBoutique,
    ventesParEmploye,
    ventesRecentes
  }

  return (
    <div className="space-y-6">
      <RapportsCommercantClient 
        boutiques={boutiques}
        filtres={{ boutiqueId, periode }}
        stats={stats}
      />
    </div>
  )
}