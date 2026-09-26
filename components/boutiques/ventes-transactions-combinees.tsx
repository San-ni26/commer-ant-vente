// components/boutiques/ventes-transactions-combinees.tsx
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatMontant } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

interface Vente {
  id: string
  montant: number
  description: string | null
  dateVente: string
  enregistrePar: { nom: string; prenom: string }
}

interface Transaction {
  id: string
  type: "VERSEMENT" | "DEPENSE"
  montant: number
  description: string | null
  dateTransaction: string
  reference: string | null
}

type ElementCombine = {
  id: string
  type: "VENTE" | "VERSEMENT" | "DEPENSE"
  montant: number
  description: string | null
  date: string
  reference?: string | null
  enregistrePar?: { nom: string; prenom: string }
}

interface Props {
  ventes: Vente[]
  transactions: Transaction[]
  filtreActif: string
}

export function VentesTransactionsCombinees({ ventes, transactions, filtreActif }: Props) {
  const [ongletActif, setOngletActif] = useState<"tous" | "ventes" | "transactions">("tous")

  const elementsCombines: ElementCombine[] = useMemo(() => {
    const ventesMap: ElementCombine[] = ventes.map(v => ({
      id: v.id,
      type: "VENTE" as const,
      montant: v.montant,
      description: v.description,
      date: v.dateVente,
      enregistrePar: v.enregistrePar,
    }))

    const transactionsMap: ElementCombine[] = transactions.map(t => ({
      id: t.id,
      type: t.type,
      montant: t.montant,
      description: t.description,
      date: t.dateTransaction,
      reference: t.reference,
    }))

    return [...ventesMap, ...transactionsMap].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [ventes, transactions])

  const stats = useMemo(() => {
    const totalVentes = ventes.reduce((s, v) => s + v.montant, 0)
    const totalVersements = transactions
      .filter(t => t.type === "VERSEMENT")
      .reduce((s, t) => s + t.montant, 0)
    const totalDepenses = transactions
      .filter(t => t.type === "DEPENSE")
      .reduce((s, t) => s + t.montant, 0)

    // Solde net = Ventes - Versements - Dépenses
    const soldeNet = totalVentes - totalVersements - totalDepenses

    return {
      totalVentes,
      totalVersements,
      totalDepenses,
      soldeNet,
      nombreVentes: ventes.length,
      nombreTransactions: transactions.length,
      nombreTotal: ventes.length + transactions.length,
    }
  }, [ventes, transactions])

  const getBadgeType = (type: string) => {
    switch (type) {
      case "VENTE":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Vente</Badge>
      case "VERSEMENT":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Versement</Badge>
      case "DEPENSE":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Dépense</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getIconType = (type: string) => {
    switch (type) {
      case "VENTE":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "VERSEMENT":
        return <TrendingDown className="h-4 w-4 text-orange-600" />
      case "DEPENSE":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const elementsAffiches = useMemo(() => {
    if (ongletActif === "tous") return elementsCombines
    if (ongletActif === "ventes") return elementsCombines.filter(e => e.type === "VENTE")
    return elementsCombines.filter(e => e.type !== "VENTE")
  }, [elementsCombines, ongletActif])

  // Calcul des totaux selon l'onglet actif
  const statsAffiches = useMemo(() => {
    const elements = elementsAffiches
    const totalVentes = elements
      .filter(e => e.type === "VENTE")
      .reduce((s, e) => s + e.montant, 0)
    const totalTransactions = elements
      .filter(e => e.type !== "VENTE")
      .reduce((s, e) => s + e.montant, 0)
    const reste = totalVentes - totalTransactions

    return { totalVentes, totalTransactions, reste }
  }, [elementsAffiches])

  const renderListe = (elements: ElementCombine[]) => {
    if (elements.length === 0) {
      return (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucun élément pour cette période</p>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {elements.map((element) => (
          <div
            key={element.id}
            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <div className="mt-1">{getIconType(element.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getBadgeType(element.type)}
                <span className="text-xs text-gray-500">
                  {format(new Date(element.date), "dd MMM yyyy HH:mm", { locale: fr })}
                </span>
              </div>
              {element.description && (
                <p className="text-sm text-gray-700 mb-1">{element.description}</p>
              )}
              {element.enregistrePar && (
                <p className="text-xs text-gray-500">
                  Par {element.enregistrePar.prenom} {element.enregistrePar.nom}
                </p>
              )}
              {element.reference && (
                <p className="text-xs text-gray-500">Réf: {element.reference}</p>
              )}
            </div>
            <div className="text-right">
              <p
                className={`text-base font-semibold ${
                  element.type === "VENTE"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {element.type === "VENTE" ? "+" : "-"}
                {formatMontant(element.montant)}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Solde net</p>
            <p className={`text-lg font-bold ${stats.soldeNet >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatMontant(stats.soldeNet)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Ventes</p>
            <p className="text-lg font-bold text-green-600">{formatMontant(stats.totalVentes)}</p>
            <p className="text-xs text-gray-500">{stats.nombreVentes} ventes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Versements</p>
            <p className="text-lg font-bold text-orange-600">{formatMontant(stats.totalVersements)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Dépenses</p>
            <p className="text-lg font-bold text-red-600">{formatMontant(stats.totalDepenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Boutons de filtre + liste + totaux */}
      <Card>
        <CardContent className="p-0 flex flex-col">
          {/* Barre de navigation des onglets — toujours visible en haut */}
          <div className="flex border-b px-4 pt-4 pb-0 gap-2 shrink-0">
            <button
              onClick={() => setOngletActif("tous")}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                ongletActif === "tous"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Tous
              <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {stats.nombreTotal}
              </span>
            </button>
            <button
              onClick={() => setOngletActif("ventes")}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                ongletActif === "ventes"
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Ventes
              <span className="ml-1.5 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                {stats.nombreVentes}
              </span>
            </button>
            <button
              onClick={() => setOngletActif("transactions")}
              className={`pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                ongletActif === "transactions"
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Transactions
              <span className="ml-1.5 rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                {stats.nombreTransactions}
              </span>
            </button>
          </div>

          {/* Zone scrollable — exactement 6 éléments visibles, le reste scroll */}
          <div className="overflow-y-auto p-4" style={{ maxHeight: "520px" }}>
            {renderListe(elementsAffiches)}
          </div>

          {/* Totaux fixes en bas — jamais dans le scroll */}
          <div className="shrink-0 border-t bg-gray-50 px-4 py-3 space-y-1.5 rounded-b-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total ventes</span>
              <span className="font-semibold text-green-600">
                +{formatMontant(statsAffiches.totalVentes)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total transactions</span>
              <span className="font-semibold text-red-600">
                -{formatMontant(statsAffiches.totalTransactions)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-1.5 mt-1">
              <span className="text-sm font-medium text-gray-700">Reste</span>
              <span className={`text-base font-bold ${statsAffiches.reste >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatMontant(statsAffiches.reste)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
