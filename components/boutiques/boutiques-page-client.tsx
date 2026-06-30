// components/boutiques/boutiques-page-client.tsx
// Client component — charge les boutiques via useBoutiques (offline-compatible)
"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAvecCache } from "@/lib/offline/cache"
import {
  getBoutiquesLocales,
  saveBoutiquesLocales,
  type BoutiqueLocale,
} from "@/lib/offline/db"
import { GestionBoutiques } from "./gestion-boutiques"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { Loader2, WifiOff } from "lucide-react"

type BoutiqueAvecAbo = {
  id: string
  nom: string
  solde: number
  _count: { ventes: number; employes: number }
  gerant: { nom: string; prenom: string | null } | null
  abonnement: { dateFin: string; duree: string } | null
  abonnementActif: boolean
}

async function getLocal(): Promise<BoutiqueAvecAbo[]> {
  try {
    const locales = await getBoutiquesLocales()
    return locales.map((b) => ({
      id: b.id,
      nom: b.nom,
      solde: b.solde,
      _count: {
        ventes: b._count?.ventes || 0,
        employes: b._count?.employes || 0,
      },
      gerant: null,
      abonnement: null,
      abonnementActif: true,
    }))
  } catch {
    return []
  }
}

async function saveLocal(data: BoutiqueAvecAbo[]): Promise<void> {
  try {
    await saveBoutiquesLocales(
      data.map((b) => ({
        id: b.id,
        nom: b.nom,
        solde: b.solde,
        gerantId: null,
        dateCreation: new Date().toISOString(),
        dateMiseAJour: new Date().toISOString(),
        _count: {
          ventes: b._count.ventes,
          transactions: 0,
          employes: b._count.employes,
        },
        gerant: b.gerant
          ? { id: "", nom: b.gerant.nom, prenom: b.gerant.prenom || "", email: "" }
          : null,
        syncedAt: Date.now(),
      }) satisfies BoutiqueLocale)
    )
  } catch { /* IDB non disponible */ }
}

export function BoutiquesPageClient() {
  const [boutiques, setBoutiques] = useState<BoutiqueAvecAbo[]>([])
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<"network" | "cache">("network")
  const isOnline = useOnlineStatus()

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const { data, source: src } = await fetchAvecCache<BoutiqueAvecAbo[]>(
        "/api/boutiques",
        getLocal,
        saveLocal
      )
      setBoutiques(data)
      setSource(src)
    } catch {
      const local = await getLocal()
      setBoutiques(local)
      setSource("cache")
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  // Recharger à la reconnexion
  useEffect(() => {
    if (isOnline && source === "cache") charger()
  }, [isOnline, source, charger])

  if (chargement && boutiques.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <>
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-2">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Données locales affichées — reconnectez-vous pour synchroniser.</span>
        </div>
      )}
      <GestionBoutiques boutiques={boutiques} onRefresh={charger} />
    </>
  )
}
