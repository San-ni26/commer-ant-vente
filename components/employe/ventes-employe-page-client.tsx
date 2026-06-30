// components/employe/ventes-employe-page-client.tsx
// Client component pour la page ventes employé — offline compatible
"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchAvecCache } from "@/lib/offline/cache"
import { getVentesLocales, saveVentesLocales, getBoutiquesLocales, ajouterALaQueue, saveVenteLocale } from "@/lib/offline/db"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { useSyncStatus } from "@/hooks/use-sync-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ShoppingCart, DollarSign, Calendar, Store, Loader2, WifiOff,
  Plus, Minus, Zap, CheckCircle, Clock,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

const MONTANTS_RAPIDES = [500, 1000, 2000, 5000, 10000, 20000, 50000]

interface VentesDuJour {
  id: string
  montant: number
  description: string | null
  dateVente: string
  enregistrePar: { nom: string; prenom: string } | null
  enAttente?: boolean
}

interface EmployeData {
  employe: {
    id: string
    nom: string
    prenom: string | null
    boutique: { id: string; nom: string; solde: number } | null
  } | null
  ventesDuJour: VentesDuJour[]
  mesVentesMoisTotal: number
}

const EMPLOYE_VENTES_CACHE_KEY = "employe_ventes_data"

function getFromSession(): EmployeData | null {
  try {
    const raw = sessionStorage.getItem(EMPLOYE_VENTES_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    // Cache valable 2 minutes
    if (Date.now() - ts > 2 * 60 * 1000) return null
    return data
  } catch {
    return null
  }
}

function saveToSession(data: EmployeData) {
  try {
    sessionStorage.setItem(EMPLOYE_VENTES_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* quota */ }
}

export function VentesEmployePageClient() {
  const isOnline = useOnlineStatus()
  const { refreshCount } = useSyncStatus()

  const [data, setData] = useState<EmployeData | null>(() => {
    if (typeof window !== "undefined") return getFromSession()
    return null
  })
  const [chargement, setChargement] = useState(!data)
  const [source, setSource] = useState<"network" | "cache">("network")

  // Form state
  const [montant, setMontant] = useState("")
  const [description, setDescription] = useState("")
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [succes, setSucces] = useState(false)
  const [derniereVente, setDerniereVente] = useState<number | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const { data: d, source: src } = await fetchAvecCache<EmployeData>(
        "/api/employe/ventes",
        async () => {
          // Fallback IDB
          const boutiques = await getBoutiquesLocales()
          // On prend la première boutique comme approximation
          const boutique = boutiques[0]
          if (!boutique) {
            return { employe: null, ventesDuJour: [], mesVentesMoisTotal: 0 }
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
              enAttente: v.enAttente,
            }))
          return {
            employe: {
              id: "local",
              nom: "Employé",
              prenom: null,
              boutique: { id: boutique.id, nom: boutique.nom, solde: boutique.solde },
            },
            ventesDuJour,
            mesVentesMoisTotal: ventesLocales.reduce((s, v) => s + v.montant, 0),
          }
        },
        async (apiData) => {
          saveToSession(apiData)
          // Sauvegarder les ventes du jour en IDB
          if (apiData.employe?.boutique?.id) {
            await saveVentesLocales(
              apiData.ventesDuJour.map((v) => ({
                id: v.id,
                montant: v.montant,
                description: v.description,
                boutiqueId: apiData.employe!.boutique!.id,
                enregistreParId: "",
                dateVente: v.dateVente,
                dateCreation: v.dateVente,
                enregistrePar: v.enregistrePar || undefined,
                syncedAt: Date.now(),
              }))
            )
          }
        }
      )
      setData(d)
      setSource(src)
    } catch {
      const sessionData = getFromSession()
      if (sessionData) {
        setData(sessionData)
      } else {
        setData({ employe: null, ventesDuJour: [], mesVentesMoisTotal: 0 })
      }
      setSource("cache")
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    if (!data) charger()
  }, [data, charger])

  useEffect(() => {
    if (isOnline && source === "cache") charger()
  }, [isOnline, source, charger])

  // ─────────── Soumission de vente (online + offline) ───────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const montantNum = parseFloat(montant)
    if (!montantNum || montantNum <= 0) {
      toast.error("Veuillez entrer un montant valide")
      return
    }

    const boutiqueId = data?.employe?.boutique?.id
    if (!boutiqueId) {
      toast.error("Aucune boutique assignée")
      return
    }

    setEnvoiEnCours(true)
    setSucces(false)

    if (!isOnline) {
      // Mode offline : sauvegarder localement + queue de sync
      const idTemp = `temp_ev_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const venteTmp: VentesDuJour = {
        id: idTemp,
        montant: montantNum,
        description: description || null,
        dateVente: new Date().toISOString(),
        enregistrePar: null,
        enAttente: true,
      }

      // Sauvegarder en IDB
      await saveVenteLocale({
        id: idTemp,
        montant: montantNum,
        description: description || null,
        boutiqueId,
        enregistreParId: "",
        dateVente: new Date().toISOString(),
        dateCreation: new Date().toISOString(),
        syncedAt: Date.now(),
        enAttente: true,
      })

      // Ajouter à la queue de sync
      await ajouterALaQueue({
        method: "POST",
        url: `/api/boutiques/${boutiqueId}/ventes`,
        body: { montant: montantNum, description: description || undefined },
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 5,
        tag: "vente:creer",
        localId: idTemp,
      })

      await refreshCount()

      // Mise à jour optimiste
      setData((prev) =>
        prev
          ? { ...prev, ventesDuJour: [venteTmp, ...prev.ventesDuJour] }
          : prev
      )

      setSucces(true)
      setDerniereVente(montantNum)
      setMontant("")
      setDescription("")
      setEnvoiEnCours(false)

      toast.warning("Vente enregistrée localement", {
        description: "Elle sera synchronisée dès que vous serez connecté.",
        duration: 5000,
      })

      setTimeout(() => setSucces(false), 1500)
      return
    }

    // Mode en ligne : appel API direct
    try {
      const reponse = await fetch(`/api/boutiques/${boutiqueId}/ventes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          montant: montantNum,
          description: description || undefined,
        }),
      })

      if (reponse.ok) {
        const nouvelleVente = await reponse.json()
        toast.success(`Vente de ${montantNum.toLocaleString()} FCFA enregistrée !`)
        setSucces(true)
        setDerniereVente(montantNum)
        setMontant("")
        setDescription("")

        // Sauvegarder en IDB
        await saveVenteLocale({
          ...nouvelleVente,
          syncedAt: Date.now(),
        })

        // Recharger les données
        await charger()
        setTimeout(() => setSucces(false), 1500)
      } else {
        const erreur = await reponse.json()
        toast.error(erreur.erreur || "Erreur lors de l'enregistrement")
      }
    } catch {
      toast.error("Erreur de connexion")
    } finally {
      setEnvoiEnCours(false)
    }
  }

  const montantRapide = (m: number) => {
    setMontant((prev) => (prev === m.toString() ? "" : m.toString()))
  }

  const ajouterMontant = (valeur: number) => {
    const actuel = parseFloat(montant) || 0
    const nouveau = Math.max(0, actuel + valeur)
    setMontant(nouveau.toString())
  }

  // ─────────── RENDU ───────────

  if (chargement && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const { employe, ventesDuJour = [], mesVentesMoisTotal = 0 } = data ?? {
    employe: null,
    ventesDuJour: [],
    mesVentesMoisTotal: 0,
  }
  const boutique = employe?.boutique
  const totalJour = ventesDuJour.reduce((sum, v) => sum + v.montant, 0)

  if (!boutique) {
    return (
      <div className="text-center py-12">
        <Store className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Aucune boutique assignée</h1>
        <p className="text-gray-500">
          Contactez votre responsable pour qu&apos;il vous affecte à une boutique.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Mode hors-ligne — Les ventes seront synchronisées à la reconnexion.</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Enregistrer une vente</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Store className="h-4 w-4" />
            {boutique.nom}
            <Badge variant="outline" className="text-xs">
              Solde: {boutique.solde.toFixed(2)} FCFA
            </Badge>
          </p>
        </div>

        {/* Résumé rapide */}
        <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-500">Aujourd&apos;hui</p>
              <p className="text-sm font-bold text-green-600">
                {totalJour.toFixed(0)} FCFA
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ShoppingCart className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-500">Nb ventes</p>
              <p className="text-sm font-bold">{ventesDuJour.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-500">Mon mois</p>
              <p className="text-sm font-bold text-purple-600">
                {mesVentesMoisTotal.toFixed(0)} FCFA
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Formulaire de vente intégré — offline compatible */}
      <Card
        className={`transition-all duration-300 ${
          succes ? "border-green-500 bg-green-50 scale-[1.02]" : ""
        }`}
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            {succes ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500 animate-bounce" />
                <span className="text-green-700">
                  Vente de {derniereVente?.toLocaleString()} FCFA enregistrée !
                </span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                Nouvelle vente
                {!isOnline && (
                  <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Hors-ligne
                  </Badge>
                )}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Montants rapides */}
            <div>
              <Label className="text-sm text-gray-500 mb-3 block">
                <Zap className="h-4 w-4 inline mr-1" />
                Montants rapides (FCFA)
              </Label>
              <div className="flex flex-wrap gap-2">
                {MONTANTS_RAPIDES.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={montant === m.toString() ? "default" : "outline"}
                    size="sm"
                    onClick={() => montantRapide(m)}
                    className="text-xs sm:text-sm"
                  >
                    {m.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Montant personnalisé */}
            <div>
              <Label htmlFor="montant">Montant (FCFA) *</Label>
              <div className="relative mt-1.5">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="montant"
                  type="number"
                  step="100"
                  min="0"
                  required
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="0"
                  className="pl-10 text-xl sm:text-2xl h-14 font-bold text-center"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => ajouterMontant(-500)}>
                  <Minus className="h-3 w-3 mr-1" />500
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => ajouterMontant(500)}>
                  <Plus className="h-3 w-3 mr-1" />500
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => ajouterMontant(1000)}>
                  <Plus className="h-3 w-3 mr-1" />1000
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => ajouterMontant(5000)}>
                  <Plus className="h-3 w-3 mr-1" />5000
                </Button>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Vente de pagne, Chaussures, Tissu..."
                rows={2}
                className="mt-1.5 resize-none"
              />
            </div>

            {/* Bouton principal */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-lg font-bold"
              disabled={envoiEnCours}
            >
              {envoiEnCours ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Enregistrer la vente
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Ventes du jour */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <CardTitle>Ventes enregistrées aujourd&apos;hui</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {ventesDuJour.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>Aucune vente enregistrée aujourd&apos;hui</p>
              <p className="text-sm">Utilisez le formulaire ci-dessus pour ajouter une vente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ventesDuJour.map((vente) => (
                <div
                  key={vente.id}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    vente.enAttente ? "bg-amber-50 border border-amber-200" : "bg-gray-50"
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      {vente.description || "Vente"}
                      {vente.enAttente && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          En attente
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(vente.dateVente), "HH:mm", { locale: fr })}
                      {vente.enregistrePar && (
                        <>
                          {" "}
                          • par {vente.enregistrePar.prenom || ""}{" "}
                          {vente.enregistrePar.nom}
                        </>
                      )}
                    </p>
                  </div>
                  <Badge variant="default">{vente.montant.toFixed(2)} FCFA</Badge>
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-between items-center pt-3 mt-3 border-t font-bold">
                <span>Total aujourd&apos;hui</span>
                <span className="text-green-600">{totalJour.toFixed(2)} FCFA</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
