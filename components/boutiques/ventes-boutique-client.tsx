// components/boutiques/ventes-boutique-client.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useVentesOffline, type Vente } from "@/hooks/use-ventes-offline"
import { fetchAvecCache } from "@/lib/offline/cache"
import { getBoutiqueLocale, getTransactionsLocales } from "@/lib/offline/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, WifiOff } from "lucide-react"
import Link from "next/link"
import { FormulaireVente } from "@/components/formulaires/formulaire-vente"
import { FiltresVentes, type FiltreVentesValeur } from "@/components/boutiques/filtres-ventes"
import { ExportPDFVentes } from "@/components/boutiques/export-pdf-ventes"
import { VentesTransactionsCombinees } from "@/components/boutiques/ventes-transactions-combinees"
import { formatMontant } from "@/lib/utils"
import { format } from "date-fns"

interface BoutiqueSimple {
  id: string
  nom: string
}

interface Transaction {
  id: string
  type: string
  montant: number
  description: string | null
  dateTransaction: string
  reference: string | null
  verifiee: boolean
}

interface Props {
  boutiqueId: string
}

export function VentesBoutiqueClient({ boutiqueId }: Props) {
  const [boutique, setBoutique] = useState<BoutiqueSimple | null>(null)
  const [chargementBoutique, setChargementBoutique] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [chargementTransactions, setChargementTransactions] = useState(true)

  // État des filtres — tout local, aucune navigation
  const [filtre, setFiltre] = useState<FiltreVentesValeur>({
    mode: "jour",
    dateJour: format(new Date(), "yyyy-MM-dd"),
    dateMois: format(new Date(), "yyyy-MM"),
    dateAnnee: new Date().getFullYear().toString(),
    dateDebut: "",
    dateFin: "",
  })

  const {
    ventes,
    chargement: chargementVentes,
    source,
    isOnline,
    actualiser
  } = useVentesOffline(boutiqueId)

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

  const chargerTransactions = useCallback(async () => {
    setChargementTransactions(true)
    try {
      // L'API retourne { transactions, totaux } — on fetch directement sans fetchAvecCache
      let txArray: Transaction[] = []

      if (typeof window !== "undefined" && !navigator.onLine) {
        // Hors ligne : lire IndexedDB
        const locales = await getTransactionsLocales(boutiqueId)
        txArray = locales as any[]
      } else {
        try {
          const reponse = await fetch(`/api/boutiques/${boutiqueId}/transactions`, {
            cache: "no-store",
          })
          if (reponse.ok) {
            const json = await reponse.json()
            // L'API retourne { transactions, totaux }
            txArray = Array.isArray(json) ? json : (json.transactions ?? [])
          } else {
            throw new Error(`HTTP ${reponse.status}`)
          }
        } catch {
          // Réseau KO → fallback IndexedDB
          const locales = await getTransactionsLocales(boutiqueId)
          txArray = locales as any[]
        }
      }

      // Garder uniquement VERSEMENT et DEPENSE
      const transactionsFiltrees = txArray.filter(
        (t: any) => t.type === "VERSEMENT" || t.type === "DEPENSE"
      )
      setTransactions(transactionsFiltrees)
    } catch {
      const locales = await getTransactionsLocales(boutiqueId)
      setTransactions(
        locales.filter((t: any) => t.type === "VERSEMENT" || t.type === "DEPENSE") as any[]
      )
    } finally {
      setChargementTransactions(false)
    }
  }, [boutiqueId])

  useEffect(() => {
    chargerBoutique()
    chargerTransactions()
  }, [chargerBoutique, chargerTransactions])

  // Filtrage des ventes en mémoire — aucune URL modifiée
  const { ventesFiltrees, transactionsFiltrees, filtreActif } = useMemo(() => {
    const { mode, dateJour, dateMois, dateAnnee, dateDebut, dateFin } = filtre
    let filtreActif = "Aujourd'hui"

    const filtrerParDate = (date: Date) => {
      if (mode === "jour" && dateJour) {
        const d = new Date(dateJour)
        d.setHours(0, 0, 0, 0)
        filtreActif = `Jour du ${d.toLocaleDateString("fr-FR")}`
        return date >= d && date < new Date(d.getTime() + 86400000)
      }
      if (mode === "mois" && dateMois) {
        const [a, m] = dateMois.split("-").map(Number)
        const start = new Date(a, m - 1, 1)
        const end = new Date(a, m, 1)
        filtreActif = `Mois de ${new Date(a, m - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
        return date >= start && date < end
      }
      if (mode === "annee" && dateAnnee) {
        const a = +dateAnnee
        const start = new Date(a, 0, 1)
        const end = new Date(a + 1, 0, 1)
        filtreActif = `Année ${dateAnnee}`
        return date >= start && date < end
      }
      if (mode === "periode" && dateDebut && dateFin) {
        const start = new Date(dateDebut)
        const end = new Date(new Date(dateFin).getTime() + 86400000)
        filtreActif = `Du ${new Date(dateDebut).toLocaleDateString("fr-FR")} au ${new Date(dateFin).toLocaleDateString("fr-FR")}`
        return date >= start && date < end
      }

      // Par défaut : aujourd'hui
      const aujourdhui = new Date()
      aujourdhui.setHours(0, 0, 0, 0)
      filtreActif = "Aujourd'hui"
      return date >= aujourdhui && date < new Date(aujourdhui.getTime() + 86400000)
    }

    const ventesFiltr = ventes.filter(v => filtrerParDate(new Date(v.dateVente)))
    const transactionsFiltr = transactions.filter(t => filtrerParDate(new Date(t.dateTransaction)))

    return {
      ventesFiltrees: ventesFiltr,
      transactionsFiltrees: transactionsFiltr,
      filtreActif
    }
  }, [ventes, transactions, filtre])

  const { totalVentes, moyenne, maxVente } = useMemo(() => {
    const total = ventesFiltrees.reduce((s, v) => s + v.montant, 0)
    const avg = ventesFiltrees.length > 0 ? total / ventesFiltrees.length : 0
    const max = ventesFiltrees.length > 0 ? Math.max(...ventesFiltrees.map(v => v.montant)) : 0
    return { totalVentes: total, moyenne: avg, maxVente: max }
  }, [ventesFiltrees])

  if (chargementBoutique || ((chargementVentes || chargementTransactions) && ventes.length === 0 && transactions.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const nomBoutique = boutique?.nom || "Boutique"

  const ventesPourAffichage = ventesFiltrees.map(v => ({
    id: v.id,
    montant: v.montant,
    description: v.description || null,
    dateVente: v.dateVente,
    enregistrePar: v.enregistrePar || { nom: "Commerçant", prenom: "" }
  }))

  const transactionsPourAffichage = transactionsFiltrees.map(t => ({
    id: t.id,
    type: t.type as "VERSEMENT" | "DEPENSE",
    montant: t.montant,
    description: t.description,
    dateTransaction: t.dateTransaction,
    reference: t.reference,
  }))

  return (
    <div className="space-y-4 sm:space-y-6">
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Mode hors-ligne — Données locales affichées.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/commercant/boutiques/${boutiqueId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{nomBoutique}</h1>
            <p className="text-sm text-gray-500">{filtreActif}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <ExportPDFVentes
            ventes={ventesPourAffichage}
            transactions={transactionsPourAffichage}
            boutiqueNom={nomBoutique}
            totalVentes={totalVentes}
            nombreVentes={ventesPourAffichage.length}
            moyenne={moyenne}
            maxVente={maxVente}
            filtreActif={filtreActif}
          />
          <FormulaireVente boutiqueId={boutiqueId} onVenteCreee={actualiser} />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <FiltresVentes valeur={filtre} onChange={setFiltre} />
        </CardContent>
      </Card>

      <VentesTransactionsCombinees
        ventes={ventesPourAffichage}
        transactions={transactionsPourAffichage}
        filtreActif={filtreActif}
      />
    </div>
  )
}
