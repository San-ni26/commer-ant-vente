// components/boutiques/boutique-detail-client.tsx
// Client component pour la page détail d'une boutique — offline compatible
"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAvecCache } from "@/lib/offline/cache"
import { getBoutiqueLocale, saveBoutiqueLocale } from "@/lib/offline/db"
import { DetailsBoutique } from "./details-boutique"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { Loader2, WifiOff } from "lucide-react"

interface BoutiqueDetail {
  id: string
  nom: string
  solde: number
  gerant?: { id: string; nom: string; prenom: string; email: string }
  employes: Array<{ id: string; nom: string; prenom: string; telephone: string; code: string }>
  _count: { ventes: number; transactions: number }
}

interface Props {
  boutiqueId: string
}

export function BoutiqueDetailClient({ boutiqueId }: Props) {
  const [boutique, setBoutique] = useState<BoutiqueDetail | null>(null)
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<"network" | "cache">("network")
  const isOnline = useOnlineStatus()

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const { data, source: src } = await fetchAvecCache<BoutiqueDetail>(
        `/api/boutiques/${boutiqueId}/details`,
        async () => {
          const local = await getBoutiqueLocale(boutiqueId)
          if (!local) return { id: boutiqueId, nom: "Boutique", solde: 0, employes: [], _count: { ventes: 0, transactions: 0 } }
          return {
            id: local.id,
            nom: local.nom,
            solde: local.solde,
            gerant: local.gerant ? { id: local.gerant.id, nom: local.gerant.nom, prenom: local.gerant.prenom, email: local.gerant.email } : undefined,
            employes: [],
            _count: { ventes: local._count?.ventes || 0, transactions: local._count?.transactions || 0 },
          }
        },
        async (data) => {
          await saveBoutiqueLocale({
            id: data.id,
            nom: data.nom,
            solde: data.solde,
            gerantId: data.gerant?.id || null,
            dateCreation: new Date().toISOString(),
            dateMiseAJour: new Date().toISOString(),
            gerant: data.gerant || null,
            _count: { ventes: data._count.ventes, transactions: data._count.transactions, employes: data.employes.length },
            syncedAt: Date.now(),
          })
        }
      )
      setBoutique(data)
      setSource(src)
    } catch {
      const local = await getBoutiqueLocale(boutiqueId)
      if (local) {
        setBoutique({ id: local.id, nom: local.nom, solde: local.solde, employes: [], _count: { ventes: local._count?.ventes || 0, transactions: 0 } })
        setSource("cache")
      }
    } finally {
      setChargement(false)
    }
  }, [boutiqueId])

  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    if (isOnline && source === "cache") charger()
  }, [isOnline, source, charger])

  if (chargement && !boutique) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!boutique) return <div className="text-center py-12 text-gray-500">Boutique non trouvée ou inaccessible hors ligne.</div>

  return (
    <>
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Données locales affichées — reconnectez-vous pour synchroniser.</span>
        </div>
      )}
      <DetailsBoutique boutique={boutique} />
    </>
  )
}
