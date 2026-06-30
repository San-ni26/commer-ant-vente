// components/employe/employes-page-client.tsx
// Client component pour la page employés — offline compatible
"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAvecCache } from "@/lib/offline/cache"
import { getEmployesLocaux, saveEmployesLocaux, getBoutiquesLocales, saveBoutiquesLocales } from "@/lib/offline/db"
import { GestionEmployes } from "@/components/employes/gestion-employes"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { Loader2, WifiOff } from "lucide-react"

interface Employe {
  id: string
  nom: string
  prenom: string | null
  telephone: string
  code: string
  boutiqueId: string | null
  boutique: { id: string; nom: string } | null
}

interface Boutique {
  id: string
  nom: string
}

interface EmployesData {
  employes: Employe[]
  boutiques: Boutique[]
}

export function EmployesPageClient() {
  const [data, setData] = useState<EmployesData | null>(null)
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<"network" | "cache">("network")
  const isOnline = useOnlineStatus()

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      // Charger employés et boutiques en parallèle via fetchAvecCache
      const [employesResult, boutiquesResult] = await Promise.all([
        fetchAvecCache<Employe[]>(
          "/api/employes",
          async () => {
            // Fallback IDB: on récupère les employés de toutes les boutiques
            const boutiquesLocales = await getBoutiquesLocales()
            const tousEmployes: Employe[] = []
            for (const b of boutiquesLocales) {
              const emps = await getEmployesLocaux(b.id)
              tousEmployes.push(
                ...emps.map((e) => ({
                  id: e.id,
                  nom: e.nom,
                  prenom: e.prenom || null,
                  telephone: e.telephone,
                  code: e.code,
                  boutiqueId: e.boutiqueId || null,
                  boutique: e.boutiqueId ? { id: b.id, nom: b.nom } : null,
                }))
              )
            }
            return tousEmployes
          },
          async (employes) => {
            // Grouper les employés par boutique pour sauvegarder en IDB
            const parBoutique = new Map<string, typeof employes>()
            for (const e of employes) {
              if (e.boutiqueId) {
                const existing = parBoutique.get(e.boutiqueId) || []
                existing.push(e)
                parBoutique.set(e.boutiqueId, existing)
              }
            }
            for (const [boutiqueId, emps] of parBoutique) {
              await saveEmployesLocaux(
                emps.map((e) => ({
                  id: e.id,
                  nom: e.nom,
                  prenom: e.prenom,
                  telephone: e.telephone,
                  code: e.code,
                  boutiqueId: e.boutiqueId,
                  syncedAt: Date.now(),
                }))
              )
            }
          }
        ),
        fetchAvecCache<Boutique[]>(
          "/api/boutiques",
          async () => {
            const locales = await getBoutiquesLocales()
            return locales.map((b) => ({ id: b.id, nom: b.nom }))
          },
          async (boutiques) => {
            // Les boutiques sont déjà sauvegardées par d'autres hooks,
            // on ne les écrase pas ici pour éviter de perdre les _count
          }
        ),
      ])

      setData({
        employes: employesResult.data,
        boutiques: boutiquesResult.data,
      })
      setSource(employesResult.source === "cache" || boutiquesResult.source === "cache" ? "cache" : "network")
    } catch {
      // Fallback complet IDB
      const boutiquesLocales = await getBoutiquesLocales()
      const tousEmployes: Employe[] = []
      for (const b of boutiquesLocales) {
        const emps = await getEmployesLocaux(b.id)
        tousEmployes.push(
          ...emps.map((e) => ({
            id: e.id,
            nom: e.nom,
            prenom: e.prenom || null,
            telephone: e.telephone,
            code: e.code,
            boutiqueId: e.boutiqueId || null,
            boutique: e.boutiqueId ? { id: b.id, nom: b.nom } : null,
          }))
        )
      }
      setData({
        employes: tousEmployes,
        boutiques: boutiquesLocales.map((b) => ({ id: b.id, nom: b.nom })),
      })
      setSource("cache")
    } finally {
      setChargement(false)
    }
  }, [])

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

  return (
    <div className="space-y-6">
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Données locales — reconnectez-vous pour synchroniser.</span>
        </div>
      )}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Employés</h1>
        <p className="text-gray-500 mt-1">Gérez vos employés et leurs accès</p>
      </div>
      <GestionEmployes
        employes={data?.employes || []}
        boutiques={data?.boutiques || []}
        onRefresh={charger}
      />
    </div>
  )
}
