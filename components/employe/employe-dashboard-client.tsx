// components/employe/employe-dashboard-client.tsx
// Client component pour le dashboard employé — offline compatible
"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAvecCache } from "@/lib/offline/cache"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ShoppingCart, DollarSign, Calendar, Store, TrendingUp, Clock, Loader2, WifiOff,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface DashboardData {
  employe: {
    id: string
    nom: string
    prenom: string | null
    boutique: { id: string; nom: string; solde: number } | null
  } | null
  ventesDuJour: Array<{
    id: string
    montant: number
    description: string | null
    dateVente: string
    enregistrePar: { nom: string; prenom: string } | null
  }>
  ventesMoisTotal: number
}

const EMPLOYE_DASH_CACHE_KEY = "employe_dash_data"

function getFromSession(): DashboardData | null {
  try {
    const raw = sessionStorage.getItem(EMPLOYE_DASH_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    // Cache valable 5 minutes
    if (Date.now() - ts > 5 * 60 * 1000) return null
    return data
  } catch { return null }
}

async function getLocalData(): Promise<DashboardData> {
  try {
    const { getBoutiquesLocales, getVentesLocales } = await import("@/lib/offline/db")
    const boutiques = await getBoutiquesLocales()
    const boutique = boutiques[0] // L'employé est associé à une seule boutique
    if (!boutique) {
      return { employe: null, ventesDuJour: [], ventesMoisTotal: 0 }
    }
    const ventesLocales = await getVentesLocales(boutique.id)
    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)
    const ventesDuJour = ventesLocales
      .filter((v) => new Date(v.dateVente) >= aujourdhui)
      .map((v) => ({
        id: v.id,
        montant: v.montant,
        description: v.description || null,
        dateVente: v.dateVente,
        enregistrePar: v.enregistrePar || null,
      }))
    return {
      employe: {
        id: "local",
        nom: "Employé",
        prenom: null,
        boutique: { id: boutique.id, nom: boutique.nom, solde: boutique.solde },
      },
      ventesDuJour,
      ventesMoisTotal: ventesLocales.reduce((s, v) => s + v.montant, 0),
    }
  } catch {
    return { employe: null, ventesDuJour: [], ventesMoisTotal: 0 }
  }
}

async function saveLocalData(data: DashboardData): Promise<void> {
  try {
    sessionStorage.setItem(EMPLOYE_DASH_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* quota */ }
  // Sauvegarder les ventes en IDB pour accès offline futur
  try {
    if (data.employe?.boutique?.id && data.ventesDuJour.length > 0) {
      const { saveVentesLocales } = await import("@/lib/offline/db")
      await saveVentesLocales(
        data.ventesDuJour.map((v) => ({
          id: v.id,
          montant: v.montant,
          description: v.description,
          boutiqueId: data.employe!.boutique!.id,
          enregistreParId: "",
          dateVente: v.dateVente,
          dateCreation: v.dateVente,
          enregistrePar: v.enregistrePar || undefined,
          syncedAt: Date.now(),
        }))
      )
    }
  } catch (err) {
    console.error("[EmployeDashboard] Erreur sauvegarde IDB:", err)
  }
}

export function EmployeDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<"network" | "cache">("network")
  const isOnline = useOnlineStatus()

  const charger = useCallback(async (silent = false) => {
    if (!silent) setChargement(true)
    try {
      const { data: d, source: src } = await fetchAvecCache<DashboardData>(
        "/api/employe/dashboard",
        getLocalData,
        saveLocalData
      )
      setData(d)
      setSource(src)
    } catch {
      const local = await getLocalData()
      setData(local)
      setSource("cache")
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    const cached = getFromSession()
    if (cached) {
      setData(cached)
      setChargement(false)
      charger(true) // Background update on page load
    } else {
      charger(false)
    }
  }, [charger])

  useEffect(() => {
    if (isOnline && source === "cache") {
      charger(true)
    }
  }, [isOnline, source, charger])

  if (chargement && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const { employe, ventesDuJour, ventesMoisTotal } = data ?? { employe: null, ventesDuJour: [], ventesMoisTotal: 0 }
  const boutique = employe?.boutique
  const totalAujourdhui = ventesDuJour.reduce((s, v) => s + v.montant, 0)

  return (
    <div className="space-y-6 animate-fadeIn">
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Données locales — reconnectez-vous pour synchroniser.</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Bonjour {employe?.prenom || "Employé"} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {boutique ? (
              <span className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                {boutique.nom}
                <Badge variant="outline" className="text-xs">
                  Solde: {boutique.solde.toFixed(2)} FCFA
                </Badge>
              </span>
            ) : (
              "Aucune boutique assignée"
            )}
          </p>
        </div>
        {boutique && (
          <Link href="/employe/ventes">
            <Button size="lg" className="w-full sm:w-auto">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Enregistrer une vente
            </Button>
          </Link>
        )}
      </div>

      {!boutique ? (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-6 text-center">
            <Store className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-yellow-800 mb-2">En attente d'affectation</h2>
            <p className="text-yellow-600">Vous n'êtes pas encore assigné à une boutique. Contactez votre responsable.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cartes stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Aujourd'hui</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{totalAujourdhui.toFixed(0)} FCFA</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <ShoppingCart className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Nb ventes</p>
                <p className="text-xl sm:text-2xl font-bold">{ventesDuJour.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Ce mois</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">{ventesMoisTotal.toFixed(0)} FCFA</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Store className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Boutique</p>
                <p className="text-sm font-bold truncate">{boutique.nom}</p>
              </CardContent>
            </Card>
          </div>

          {/* Ventes du jour */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <CardTitle>Ventes du jour — {boutique.nom}</CardTitle>
              </div>
              <Badge variant="default">{ventesDuJour.length} vente(s)</Badge>
            </CardHeader>
            <CardContent>
              {ventesDuJour.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p>Aucune vente enregistrée aujourd'hui</p>
                  <Link href="/employe/ventes" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Enregistrer une vente
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {ventesDuJour.map((vente) => (
                    <div key={vente.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{vente.description || "Vente"}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(vente.dateVente), "HH:mm", { locale: fr })}
                          {vente.enregistrePar && (
                            <> • par {vente.enregistrePar.prenom} {vente.enregistrePar.nom}</>
                          )}
                        </p>
                      </div>
                      <Badge variant="default">{vente.montant.toFixed(2)} FCFA</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
