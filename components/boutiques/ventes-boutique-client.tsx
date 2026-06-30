// components/boutiques/ventes-boutique-client.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useVentesOffline, type Vente } from "@/hooks/use-ventes-offline"
import { fetchAvecCache } from "@/lib/offline/cache"
import { getBoutiqueLocale } from "@/lib/offline/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, WifiOff } from "lucide-react"
import Link from "next/link"
import { FormulaireVente } from "@/components/formulaires/formulaire-vente"
import { ListeVentesFiltrees } from "@/components/boutiques/liste-ventes-filtrees"
import { FiltresVentes } from "@/components/boutiques/filtres-ventes"
import { ExportPDFVentes } from "@/components/boutiques/export-pdf-ventes"

interface BoutiqueSimple {
  id: string
  nom: string
}

interface Props {
  boutiqueId: string
}

export function VentesBoutiqueClient({ boutiqueId }: Props) {
  const searchParams = useSearchParams()
  const [boutique, setBoutique] = useState<BoutiqueSimple | null>(null)
  const [chargementBoutique, setChargementBoutique] = useState(true)

  const {
    ventes,
    chargement: chargementVentes,
    source,
    isOnline,
    actualiser
  } = useVentesOffline(boutiqueId)

  // Charger les métadonnées simples de la boutique
  const chargerBoutique = useCallback(async () => {
    setChargementBoutique(true)
    try {
      const { data } = await fetchAvecCache<BoutiqueSimple>(
        `/api/boutiques/${boutiqueId}/details`,
        async () => {
          const local = await getBoutiqueLocale(boutiqueId)
          return { id: boutiqueId, nom: local?.nom || "Boutique" }
        },
        async () => {}
      )
      setBoutique(data)
    } catch {
      const local = await getBoutiqueLocale(boutiqueId)
      setBoutique({ id: boutiqueId, nom: local?.nom || "Boutique" })
    } finally {
      setChargementBoutique(false)
    }
  }, [boutiqueId])

  useEffect(() => {
    chargerBoutique()
  }, [chargerBoutique])

  // Filtrage des ventes en mémoire selon les searchParams
  const dateParam = searchParams.get("date")
  const moisParam = searchParams.get("mois")
  const anneeParam = searchParams.get("annee")
  const debutParam = searchParams.get("debut")
  const finParam = searchParams.get("fin")

  const { ventesFiltrees, filtreActif } = useMemo(() => {
    let filtreActif = "Aujourd'hui"
    
    const filtered = ventes.filter((v) => {
      const dateVente = new Date(v.dateVente)
      
      if (dateParam) {
        const d = new Date(dateParam)
        d.setHours(0, 0, 0, 0)
        filtreActif = `Jour du ${d.toLocaleDateString("fr-FR")}`
        return dateVente >= d && dateVente < new Date(d.getTime() + 86400000)
      }
      if (moisParam) {
        const [a, m] = moisParam.split("-").map(Number)
        const start = new Date(a, m - 1, 1)
        const end = new Date(a, m, 1)
        filtreActif = `Mois de ${new Date(a, m - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
        return dateVente >= start && dateVente < end
      }
      if (anneeParam) {
        const a = +anneeParam
        const start = new Date(a, 0, 1)
        const end = new Date(a + 1, 0, 1)
        filtreActif = `Année ${anneeParam}`
        return dateVente >= start && dateVente < end
      }
      if (debutParam && finParam) {
        const start = new Date(debutParam)
        const end = new Date(new Date(finParam).getTime() + 86400000)
        filtreActif = `Du ${new Date(debutParam).toLocaleDateString("fr-FR")} au ${new Date(finParam).toLocaleDateString("fr-FR")}`
        return dateVente >= start && dateVente < end
      }

      // Par défaut : aujourd'hui
      const aujourdhui = new Date()
      aujourdhui.setHours(0, 0, 0, 0)
      return dateVente >= aujourdhui && dateVente < new Date(aujourdhui.getTime() + 86400000)
    })

    return { ventesFiltrees: filtered, filtreActif }
  }, [ventes, dateParam, moisParam, anneeParam, debutParam, finParam])

  // Statistiques en mémoire
  const { totalVentes, moyenne, maxVente } = useMemo(() => {
    const total = ventesFiltrees.reduce((s, v) => s + v.montant, 0)
    const avg = ventesFiltrees.length > 0 ? total / ventesFiltrees.length : 0
    const max = ventesFiltrees.length > 0 ? Math.max(...ventesFiltrees.map(v => v.montant)) : 0
    return { totalVentes: total, moyenne: avg, maxVente: max }
  }, [ventesFiltrees])

  if (chargementBoutique || (chargementVentes && ventes.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const nomBoutique = boutique?.nom || "Boutique"

  // Adapter les ventes pour la liste (le composant s'attend à enregistrePar au format objet)
  const ventesPourListe = ventesFiltrees.map(v => ({
    id: v.id,
    montant: v.montant,
    description: v.description || null,
    dateVente: v.dateVente,
    enregistrePar: v.enregistrePar || { nom: "Commerçant", prenom: "" }
  }))

  return (
    <div className="space-y-4 sm:space-y-6">
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Mode hors-ligne — Données de ventes locales affichées.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/commercant/boutiques/${boutiqueId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{nomBoutique} - Ventes</h1>
            <p className="text-sm text-gray-500">{filtreActif}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <ExportPDFVentes
            ventes={ventesPourListe}
            boutiqueNom={nomBoutique}
            totalVentes={totalVentes}
            nombreVentes={ventesPourListe.length}
            moyenne={moyenne}
            maxVente={maxVente}
            filtreActif={filtreActif}
          />
          <FormulaireVente boutiqueId={boutiqueId} onVenteCreee={actualiser} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-green-600">{totalVentes.toLocaleString("fr-FR")} FCFA</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Nb ventes</p>
          <p className="text-lg font-bold">{ventesFiltrees.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Moyenne</p>
          <p className="text-lg font-bold text-blue-600">{moyenne.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Max</p>
          <p className="text-lg font-bold text-purple-600">{maxVente.toLocaleString("fr-FR")} FCFA</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4"><FiltresVentes /></CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Liste des ventes <Badge variant="outline" className="ml-2">{ventesPourListe.length}</Badge></CardTitle></CardHeader>
        <CardContent><ListeVentesFiltrees ventes={ventesPourListe} /></CardContent>
      </Card>
    </div>
  )
}
