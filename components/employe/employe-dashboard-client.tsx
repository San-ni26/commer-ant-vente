// components/employe/employe-dashboard-client.tsx
// Client component pour le dashboard employé — offline compatible
"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAvecCache } from "@/lib/offline/cache"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ShoppingCart, DollarSign, Calendar, Store, TrendingUp, Clock, Loader2, WifiOff, Search,
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

function getFromSession(periode: string = "jour"): DashboardData | null {
  try {
    const raw = sessionStorage.getItem(`${EMPLOYE_DASH_CACHE_KEY}_${periode}`)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    // Cache valable 5 minutes
    if (Date.now() - ts > 5 * 60 * 1000) return null
    return data
  } catch { return null }
}

async function getLocalData(periode: string = "jour"): Promise<DashboardData> {
  try {
    const { getBoutiquesLocales, getVentesLocales } = await import("@/lib/offline/db")
    const boutiques = await getBoutiquesLocales()
    const boutique = boutiques[0] // L'employé est associé à une seule boutique
    if (!boutique) {
      return { employe: null, ventesDuJour: [], ventesMoisTotal: 0 }
    }
    const ventesLocales = await getVentesLocales(boutique.id)
    
    const aujourd = new Date()
    aujourd.setHours(0, 0, 0, 0)
    
    let dateDebut = aujourd
    if (periode === "semaine") {
      const day = aujourd.getDay()
      const diff = aujourd.getDate() - day + (day === 0 ? -6 : 1)
      dateDebut = new Date(aujourd)
      dateDebut.setDate(diff)
      dateDebut.setHours(0, 0, 0, 0)
    } else if (periode === "mois") {
      dateDebut = new Date(aujourd.getFullYear(), aujourd.getMonth(), 1)
    } else if (periode === "annee") {
      dateDebut = new Date(aujourd.getFullYear(), 0, 1)
    }

    const ventesDuJour = ventesLocales
      .filter((v) => new Date(v.dateVente) >= dateDebut)
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

async function saveLocalData(data: DashboardData, periode: string = "jour"): Promise<void> {
  try {
    sessionStorage.setItem(`${EMPLOYE_DASH_CACHE_KEY}_${periode}`, JSON.stringify({ data, ts: Date.now() }))
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

const TITRES_PERIODES = {
  jour: "Ventes du jour",
  semaine: "Ventes de la semaine",
  mois: "Ventes du mois",
  annee: "Ventes de l'année",
}

const LABELS_STATS = {
  jour: "Aujourd'hui",
  semaine: "Cette semaine",
  mois: "Ce mois",
  annee: "Cette année",
}

const PERIODES = [
  { id: "jour", label: "Jour" },
  { id: "semaine", label: "Semaine" },
  { id: "mois", label: "Mois" },
  { id: "annee", label: "Année" },
]

const formatVenteDate = (dateStr: string, currentPeriode: string) => {
  const d = new Date(dateStr)
  if (currentPeriode === "jour") {
    return format(d, "HH:mm", { locale: fr })
  }
  return format(d, "dd MMM yyyy, HH:mm", { locale: fr })
}

export function EmployeDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<"network" | "cache">("network")
  const [recherche, setRecherche] = useState("")
  const [periode, setPeriode] = useState<"jour" | "semaine" | "mois" | "annee">("jour")
  const isOnline = useOnlineStatus()

  const charger = useCallback(async (per: string, silent = false) => {
    if (!silent) setChargement(true)
    try {
      const { data: d, source: src } = await fetchAvecCache<DashboardData>(
        `/api/employe/dashboard?periode=${per}`,
        () => getLocalData(per),
        (apiData) => saveLocalData(apiData, per)
      )
      setData(d)
      setSource(src)
    } catch {
      const local = await getLocalData(per)
      setData(local)
      setSource("cache")
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    const cached = getFromSession(periode)
    if (cached) {
      setData(cached)
      setChargement(false)
      charger(periode, true) // Background update on page load / period switch
    } else {
      charger(periode, false)
    }
  }, [charger, periode])

  useEffect(() => {
    if (isOnline && source === "cache") {
      charger(periode, true)
    }
  }, [isOnline, source, charger, periode])

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

  const ventesFiltrees = ventesDuJour.filter((vente) => {
    if (!recherche) return true
    const term = recherche.toLowerCase()
    const descMatch = (vente.description || "").toLowerCase().includes(term)
    const auteurMatch = vente.enregistrePar
      ? `${vente.enregistrePar.prenom} ${vente.enregistrePar.nom}`.toLowerCase().includes(term)
      : false
    const montantMatch = vente.montant.toString().includes(term)
    return descMatch || auteurMatch || montantMatch
  })

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
                <p className="text-xs text-gray-500">{LABELS_STATS[periode]}</p>
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
            <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <CardTitle>{TITRES_PERIODES[periode]} — {boutique.nom}</CardTitle>
                </div>
                {/* Sélecteur de période */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg border text-xs w-fit shrink-0">
                  {PERIODES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setRecherche("") // effacer la recherche pour éviter la confusion
                        setPeriode(p.id as any)
                      }}
                      className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                        periode === p.id
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 w-full lg:w-auto">
                {ventesDuJour.length > 0 && (
                  <div className="relative flex-1 lg:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher une vente..."
                      value={recherche}
                      onChange={(e) => setRecherche(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                )}
                <Badge variant="default" className="shrink-0">{ventesFiltrees.length} vente(s)</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {ventesDuJour.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p>Aucune vente enregistrée pour cette période</p>
                  <Link href="/employe/ventes" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Enregistrer une vente
                    </Button>
                  </Link>
                </div>
              ) : ventesFiltrees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p>Aucune vente ne correspond à &quot;{recherche}&quot;</p>
                  <Button variant="ghost" size="sm" onClick={() => setRecherche("")} className="mt-2 text-blue-600 hover:text-blue-700">
                    Effacer la recherche
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {ventesFiltrees.map((vente) => (
                    <div key={vente.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{vente.description || "Vente"}</p>
                        <p className="text-xs text-gray-500">
                          {formatVenteDate(vente.dateVente, periode)}
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
