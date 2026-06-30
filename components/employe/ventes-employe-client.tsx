// components/employe/ventes-employe-client.tsx
// Client component pour la page ventes employé — offline compatible
"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAvecCache } from "@/lib/offline/cache"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FormulaireVenteEmploye } from "@/components/employes/formulaire-vente-employe"
import { Calendar, ShoppingCart, DollarSign, Store, Loader2, WifiOff } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface DashboardData {
  employe: {
    id: string; nom: string; prenom: string | null
    boutique: { id: string; nom: string; solde: number } | null
  } | null
  ventesDuJour: Array<{
    id: string; montant: number; description: string | null
    dateVente: string
    enregistrePar: { nom: string; prenom: string } | null
  }>
  ventesMoisTotal: number
}

export function VentesEmployeClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<"network" | "cache">("network")
  const isOnline = useOnlineStatus()

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const { data: d, source: src } = await fetchAvecCache<DashboardData>(
        "/api/employe/dashboard",
        async () => ({ employe: null, ventesDuJour: [], ventesMoisTotal: 0 }),
        async () => {}
      )
      setData(d)
      setSource(src)
    } catch {
      setData({ employe: null, ventesDuJour: [], ventesMoisTotal: 0 })
      setSource("cache")
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => { charger() }, [charger])
  useEffect(() => { if (isOnline && source === "cache") charger() }, [isOnline, source, charger])

  if (chargement && !data) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  const { employe, ventesDuJour, ventesMoisTotal } = data ?? { employe: null, ventesDuJour: [], ventesMoisTotal: 0 }
  const boutique = employe?.boutique
  const totalJour = ventesDuJour.reduce((s, v) => s + v.montant, 0)

  if (!boutique) {
    return (
      <div className="text-center py-12">
        <Store className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Aucune boutique assignée</h1>
        <p className="text-gray-500">Contactez votre responsable pour qu'il vous affecte à une boutique.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Données locales — reconnectez-vous pour synchroniser.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Enregistrer une vente</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Store className="h-4 w-4" />
            {boutique.nom}
            <Badge variant="outline" className="text-xs">Solde: {boutique.solde.toFixed(2)} FCFA</Badge>
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
          <Card><CardContent className="p-3 text-center">
            <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500">Aujourd'hui</p>
            <p className="text-sm font-bold text-green-600">{totalJour.toFixed(0)} FCFA</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <ShoppingCart className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500">Nb ventes</p>
            <p className="text-sm font-bold">{ventesDuJour.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Calendar className="h-5 w-5 text-purple-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500">Mon mois</p>
            <p className="text-sm font-bold text-purple-600">{ventesMoisTotal.toFixed(0)} FCFA</p>
          </CardContent></Card>
        </div>
      </div>

      <FormulaireVenteEmploye boutiqueId={boutique.id} onVenteCreee={charger} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <CardTitle>Ventes enregistrées aujourd'hui</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {ventesDuJour.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>Aucune vente enregistrée aujourd'hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ventesDuJour.map((vente) => (
                <div key={vente.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{vente.description || "Vente"}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(vente.dateVente), "HH:mm", { locale: fr })}
                      {vente.enregistrePar && <> • par {vente.enregistrePar.prenom} {vente.enregistrePar.nom}</>}
                    </p>
                  </div>
                  <Badge variant="default">{vente.montant.toFixed(2)} FCFA</Badge>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-3 border-t font-bold">
                <span>Total aujourd'hui</span>
                <span className="text-green-600">{totalJour.toFixed(2)} FCFA</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
