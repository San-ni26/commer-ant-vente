// components/dashboard/dashboard-commercant-client.tsx
// Client component — lit depuis l'API (avec fallback IndexedDB offline)
"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAvecCache } from "@/lib/offline/cache"
import { getDB } from "@/lib/offline/db"
import { TableauDeBordCommercant } from "./tableau-de-bord-commercant"
import { Loader2 } from "lucide-react"

interface Stats {
  nombreBoutiques: number
  nombreBoutiquesBloquees: number
  ventesDuJour: number
  totalVentes: number
  soldeTotal: number
  boutiquesRecentes: Array<{
    id: string
    nom: string
    solde: number
    gerant: string | null
    nombreVentes: number
    nombreEmployes: number
    abonnementActif: boolean
    abonnement: { dateFin: string; duree: string } | null
  }>
}

const STATS_CACHE_KEY = "dashboard_stats"

async function getStatsLocal(): Promise<Stats> {
  try {
    const db = await getDB()
    const tx = db.transaction("boutiques", "readonly")
    const boutiques = await tx.store.getAll()
    // Calcul approximatif depuis les données locales
    return {
      nombreBoutiques: boutiques.length,
      nombreBoutiquesBloquees: 0,
      ventesDuJour: 0,
      totalVentes: 0,
      soldeTotal: boutiques.reduce((s, b) => s + (b.solde || 0), 0),
      boutiquesRecentes: boutiques.slice(0, 5).map((b) => ({
        id: b.id,
        nom: b.nom,
        solde: b.solde,
        gerant: null,
        nombreVentes: b._count?.ventes || 0,
        nombreEmployes: b._count?.employes || 0,
        abonnementActif: true,
        abonnement: null,
      })),
    }
  } catch {
    return {
      nombreBoutiques: 0,
      nombreBoutiquesBloquees: 0,
      ventesDuJour: 0,
      totalVentes: 0,
      soldeTotal: 0,
      boutiquesRecentes: [],
    }
  }
}

async function saveStatsLocal(stats: Stats): Promise<void> {
  // Stocker aussi dans sessionStorage pour un accès rapide
  try {
    sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ data: stats, ts: Date.now() }))
  } catch { /* quota exceeded */ }
}

function getStatsFromSession(): Stats | null {
  try {
    const raw = sessionStorage.getItem(STATS_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    // Cache valable 5 minutes
    if (Date.now() - ts > 5 * 60 * 1000) return null
    return data
  } catch { return null }
}

export function DashboardCommercantClient() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const { data } = await fetchAvecCache<Stats>(
        "/api/dashboard/stats",
        getStatsLocal,
        saveStatsLocal
      )
      setStats(data)
    } catch {
      const local = await getStatsLocal()
      setStats(local)
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    const cached = getStatsFromSession()
    if (cached) {
      setStats(cached)
      setChargement(false)
    } else {
      charger()
    }
  }, [charger])

  // Recharger à la reconnexion
  useEffect(() => {
    const handleOnline = () => charger()
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [charger])

  if (chargement && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!stats) return null

  return <TableauDeBordCommercant statistiques={stats} />
}
