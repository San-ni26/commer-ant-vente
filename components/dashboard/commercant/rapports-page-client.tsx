// components/dashboard/commercant/rapports-page-client.tsx
// Client wrapper pour la page rapports — charge les données via API avec fallback offline
"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { fetchAvecCache } from "@/lib/offline/cache"
import { getBoutiquesLocales, getVentesLocales, getTransactionsLocales } from "@/lib/offline/db"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { RapportsCommercantClient } from "./rapports-client"
import { Loader2, WifiOff } from "lucide-react"

interface RapportsData {
  boutiques: Array<{ id: string; nom: string }>
  filtres: { boutiqueId: string; periode: string }
  stats: {
    totalVentes: number
    nombreVentes: number
    panierMoyen: number
    totalDepenses: number
    totalVersements: number
    ventesParJour: Array<{ date: string; montant: number }>
    ventesParBoutique: Array<{ id: string; nom: string; montant: number; pourcentage: number }>
    ventesParEmploye: Array<{ nom: string; prenom: string | null; montant: number; pourcentage: number }>
    ventesRecentes: Array<{
      id: string
      montant: number
      description: string | null
      dateVente: string
      boutique: { nom: string }
      enregistrePar: { nom: string; prenom: string | null }
    }>
  }
}

/**
 * Construit des statistiques approximatives depuis les données IDB locales
 */
async function buildLocalStats(boutiqueId: string, periode: string): Promise<RapportsData> {
  const boutiquesLocales = await getBoutiquesLocales()
  const boutiques = boutiquesLocales.map((b) => ({ id: b.id, nom: b.nom }))

  // Déterminer quelles boutiques interroger
  const boutiqueIds = boutiqueId !== "all"
    ? [boutiqueId]
    : boutiquesLocales.map((b) => b.id)

  // Collecter toutes les ventes locales
  let toutesVentes: Array<{
    id: string
    montant: number
    description?: string | null
    dateVente: string
    boutiqueId: string
    boutiqueNom: string
    enregistreParNom: string
    enregistreParPrenom: string
  }> = []

  for (const bId of boutiqueIds) {
    const boutique = boutiquesLocales.find((b) => b.id === bId)
    const ventesLocales = await getVentesLocales(bId)
    toutesVentes.push(
      ...ventesLocales.map((v) => ({
        id: v.id,
        montant: v.montant,
        description: v.description,
        dateVente: v.dateVente,
        boutiqueId: v.boutiqueId,
        boutiqueNom: boutique?.nom || "Boutique",
        enregistreParNom: v.enregistrePar?.nom || "Employé",
        enregistreParPrenom: v.enregistrePar?.prenom || "",
      }))
    )
  }

  // Filtrer par période
  const maintenant = new Date()
  let dateDebut: Date | undefined
  if (periode === "7j") {
    dateDebut = new Date(maintenant)
    dateDebut.setDate(maintenant.getDate() - 7)
    dateDebut.setHours(0, 0, 0, 0)
  } else if (periode === "30j") {
    dateDebut = new Date(maintenant)
    dateDebut.setDate(maintenant.getDate() - 30)
    dateDebut.setHours(0, 0, 0, 0)
  }

  if (dateDebut) {
    toutesVentes = toutesVentes.filter((v) => new Date(v.dateVente) >= dateDebut!)
  }

  // Calculs
  const totalVentes = toutesVentes.reduce((s, v) => s + v.montant, 0)
  const nombreVentes = toutesVentes.length
  const panierMoyen = nombreVentes > 0 ? totalVentes / nombreVentes : 0

  // Transactions locales pour dépenses/versements
  let totalDepenses = 0
  let totalVersements = 0
  for (const bId of boutiqueIds) {
    const transactions = await getTransactionsLocales(bId)
    for (const t of transactions) {
      if (dateDebut && new Date(t.dateTransaction) < dateDebut) continue
      if (["DEPENSE", "RETRAIT"].includes(t.type)) totalDepenses += t.montant
      if (["VERSEMENT", "VENTE", "VIREMENT_BANCAIRE"].includes(t.type)) totalVersements += t.montant
    }
  }

  // Ventilation par boutique
  const mapBoutiques = new Map<string, { nom: string; montant: number }>()
  boutiques.forEach((b) => mapBoutiques.set(b.id, { nom: b.nom, montant: 0 }))
  toutesVentes.forEach((v) => {
    const b = mapBoutiques.get(v.boutiqueId)
    if (b) mapBoutiques.set(v.boutiqueId, { nom: b.nom, montant: b.montant + v.montant })
  })
  const ventesParBoutique = Array.from(mapBoutiques.entries())
    .map(([id, d]) => ({
      id,
      nom: d.nom,
      montant: d.montant,
      pourcentage: totalVentes > 0 ? (d.montant / totalVentes) * 100 : 0,
    }))
    .sort((a, b) => b.montant - a.montant)

  // Ventes récentes
  const ventesRecentes = [...toutesVentes]
    .sort((a, b) => new Date(b.dateVente).getTime() - new Date(a.dateVente).getTime())
    .slice(0, 8)
    .map((v) => ({
      id: v.id,
      montant: v.montant,
      description: v.description || null,
      dateVente: v.dateVente,
      boutique: { nom: v.boutiqueNom },
      enregistrePar: { nom: v.enregistreParNom, prenom: v.enregistreParPrenom },
    }))

  return {
    boutiques,
    filtres: { boutiqueId, periode },
    stats: {
      totalVentes,
      nombreVentes,
      panierMoyen,
      totalDepenses,
      totalVersements,
      ventesParJour: [], // Approximation limitée en offline
      ventesParBoutique,
      ventesParEmploye: [], // Données employé pas complètes en IDB
      ventesRecentes,
    },
  }
}

export function RapportsPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isOnline = useOnlineStatus()

  const boutiqueId = searchParams.get("boutiqueId") || "all"
  const periode = searchParams.get("periode") || "7j"

  const [data, setData] = useState<RapportsData | null>(null)
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<"network" | "cache">("network")

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const apiUrl = `/api/rapports?boutiqueId=${encodeURIComponent(boutiqueId)}&periode=${encodeURIComponent(periode)}`
      const { data: d, source: src } = await fetchAvecCache<RapportsData>(
        apiUrl,
        async () => buildLocalStats(boutiqueId, periode),
        async () => {
          // Les données de rapports sont calculées, pas besoin de les sauvegarder en IDB
          // car elles sont construites à partir des ventes/transactions déjà sauvegardées
        }
      )
      setData(d)
      setSource(src)
    } catch {
      const local = await buildLocalStats(boutiqueId, periode)
      setData(local)
      setSource("cache")
    } finally {
      setChargement(false)
    }
  }, [boutiqueId, periode])

  useEffect(() => {
    charger()
  }, [charger])

  useEffect(() => {
    if (isOnline && source === "cache") charger()
  }, [isOnline, source, charger])

  if (chargement && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data) return null

  return (
    <>
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Mode hors-ligne — Données approximatives basées sur le cache local.</span>
        </div>
      )}
      <RapportsCommercantClient
        boutiques={data.boutiques}
        filtres={data.filtres}
        stats={data.stats}
      />
    </>
  )
}
