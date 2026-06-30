// components/transactions/transactions-boutique-client.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTransactionsOffline } from "@/hooks/use-transactions-offline"
import { fetchAvecCache } from "@/lib/offline/cache"
import { getBoutiqueLocale } from "@/lib/offline/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, WifiOff } from "lucide-react"
import Link from "next/link"
import { FormulaireTransaction } from "@/components/formulaires/formulaire-transaction"
import { ListeTransactions } from "@/components/transactions/liste-transactions"
import { ExportPDFTransactions } from "@/components/transactions/export-pdf-transactions"

interface BoutiqueSimple {
  id: string
  nom: string
  solde: number
}

interface Props {
  boutiqueId: string
}

export function TransactionsBoutiqueClient({ boutiqueId }: Props) {
  const [boutique, setBoutique] = useState<BoutiqueSimple | null>(null)
  const [chargementBoutique, setChargementBoutique] = useState(true)

  const {
    transactions,
    chargement: chargementTransactions,
    source,
    isOnline,
    actualiser
  } = useTransactionsOffline(boutiqueId)

  // Charger les métadonnées de la boutique
  const chargerBoutique = useCallback(async () => {
    setChargementBoutique(true)
    try {
      const { data } = await fetchAvecCache<BoutiqueSimple>(
        `/api/boutiques/${boutiqueId}/details`,
        async () => {
          const local = await getBoutiqueLocale(boutiqueId)
          return { id: boutiqueId, nom: local?.nom || "Boutique", solde: local?.solde || 0 }
        },
        async () => {}
      )
      setBoutique(data)
    } catch {
      const local = await getBoutiqueLocale(boutiqueId)
      setBoutique({ id: boutiqueId, nom: local?.nom || "Boutique", solde: local?.solde || 0 })
    } finally {
      setChargementBoutique(false)
    }
  }, [boutiqueId])

  useEffect(() => {
    chargerBoutique()
  }, [chargerBoutique])

  // Statistiques calculées à la volée
  const stats = useMemo(() => {
    return {
      totalVersements: transactions
        .filter(t => ["VERSEMENT", "VIREMENT_BANCAIRE"].includes(t.type) && t.verifiee)
        .reduce((sum, t) => sum + t.montant, 0),
      totalDepenses: transactions
        .filter(t => ["DEPENSE", "RETRAIT"].includes(t.type) && t.verifiee)
        .reduce((sum, t) => sum + t.montant, 0),
      enAttente: transactions.filter(t => !t.verifiee).length,
    }
  }, [transactions])

  if (chargementBoutique || (chargementTransactions && transactions.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const nomBoutique = boutique?.nom || "Boutique"
  const soldeBoutique = boutique?.solde || 0

  // Adapter pour ListeTransactions (s'attend à verifieePar au format objet)
  const transactionsPourListe = transactions.map(t => ({
    ...t,
    description: t.description || null,
    reference: t.reference || null,
    verifieePar: t.verifieeParId ? { nom: "Commerçant", prenom: "" } : null
  }))

  return (
    <div className="space-y-4 sm:space-y-6">
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Mode hors-ligne — Données de transactions locales affichées.</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/commercant/boutiques/${boutiqueId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{nomBoutique} - Transactions</h1>
            <p className="text-sm text-gray-500">Versements, dépenses et virements</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportPDFTransactions transactions={transactionsPourListe} boutiqueNom={nomBoutique} />
          <FormulaireTransaction boutiqueId={boutiqueId} onTransactionCreee={actualiser} />
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Versements</p>
            <p className="text-lg sm:text-xl font-bold text-green-600">
              +{stats.totalVersements.toLocaleString("fr-FR")} FCFA
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Dépenses</p>
            <p className="text-lg sm:text-xl font-bold text-red-600">
              -{stats.totalDepenses.toLocaleString("fr-FR")} FCFA
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">En attente</p>
            <p className="text-lg sm:text-xl font-bold text-orange-600">
              {stats.enAttente}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Solde boutique</p>
            <p className="text-lg sm:text-xl font-bold text-blue-600">
              {soldeBoutique.toLocaleString("fr-FR")} FCFA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ListeTransactions
            transactions={transactionsPourListe}
            boutiqueId={boutiqueId}
            estCommercant={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
