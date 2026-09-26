// src/components/transactions/TransactionList.tsx
"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatMontant } from "@/lib/utils"
import { fetchAvecCache } from "@/lib/offline/cache"
import { ajouterActionHorsLigne } from "@/lib/offline/queue"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { toast } from "sonner"
import { Loader2, WifiOff } from "lucide-react"

interface Transaction {
  id: string
  type: string
  amount: number
  description?: string
  reference?: string
  verified: boolean
  transactionDate: string
  verifier?: {
    name: string
  }
}

async function getTransactionsLocal(): Promise<Transaction[]> {
  return []
}

async function saveTransactionsLocal(data: Transaction[]): Promise<void> {
  // Optionnel : stocker dans sessionStorage
}

export function TransactionList({ shopId }: { shopId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<"network" | "cache">("network")
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)
  const isOnline = useOnlineStatus()

  const fetchTransactions = async () => {
    try {
      setChargement(true)
      const { data, source: src } = await fetchAvecCache<Transaction[]>(
        `/api/boutiques/${shopId}/transactions`,
        getTransactionsLocal,
        saveTransactionsLocal
      )
      setTransactions(data)
      setSource(src)
    } catch (erreur) {
      console.error("Erreur:", erreur)
      toast.error("Impossible de charger les transactions")
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [shopId])

  // Recharger à la reconnexion
  useEffect(() => {
    if (isOnline && source === "cache") fetchTransactions()
  }, [isOnline, source])

  const getStatusBadge = (type: string, verified: boolean) => {
    if (!verified) return <Badge variant="secondary">En attente</Badge>

    switch (type) {
      case "VENTE":
        return <Badge variant="default">Vente</Badge>
      case "VERSEMENT":
        return <Badge variant="outline">Versement</Badge>
      case "DEPENSE":
        return <Badge variant="destructive">Dépense</Badge>
      case "VIREMENT_BANCAIRE":
        return <Badge variant="outline">Virement</Badge>
      case "RETRAIT":
        return <Badge variant="secondary">Retrait</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "VENTE": return "Vente"
      case "VERSEMENT": return "Versement"
      case "DEPENSE": return "Dépense"
      case "VIREMENT_BANCAIRE": return "Virement bancaire"
      case "RETRAIT": return "Retrait"
      default: return type
    }
  }

  const handleVerify = async (transactionId: string) => {
    setActionEnCours(transactionId)

    try {
      if (isOnline) {
        const reponse = await fetch(`/api/boutiques/${shopId}/transactions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId, verified: true })
        })

        if (reponse.ok) {
          toast.success("Transaction vérifiée")
          fetchTransactions()
        } else {
          throw new Error("Échec de la vérification")
        }
      } else {
        // Mode hors ligne : ajouter à la queue
        await ajouterActionHorsLigne({
          url: `/api/boutiques/${shopId}/transactions`,
          method: "PUT",
          body: { transactionId, verified: true },
          metadata: { type: "verify_transaction", transactionId }
        })

        toast.success("Vérification enregistrée — sera synchronisée à la reconnexion")

        // Mise à jour optimiste locale
        setTransactions(prev =>
          prev.map(t => t.id === transactionId ? { ...t, verified: true } : t)
        )
      }
    } catch (erreur) {
      console.error("Erreur lors de la vérification:", erreur)
      toast.error("Erreur lors de la vérification")
    } finally {
      setActionEnCours(null)
    }
  }

  if (chargement) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune transaction trouvée
      </div>
    )
  }

  return (
    <>
      {source === "cache" && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-4">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Données locales — reconnectez-vous pour synchroniser.</span>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.transactionDate), "dd/MM/yyyy HH:mm", { locale: fr })}
                </TableCell>
                <TableCell>{getTypeLabel(transaction.type)}</TableCell>
                <TableCell>{transaction.description || "-"}</TableCell>
                <TableCell>{transaction.reference || "-"}</TableCell>
                <TableCell className="text-right">
                  <span className={transaction.type === "VENTE" || transaction.type === "VERSEMENT"
                    ? "text-green-600"
                    : "text-red-600"
                  }>
                    {transaction.type === "DEPENSE" || transaction.type === "RETRAIT" ? "-" : "+"}
                    {formatMontant(transaction.amount)}
                  </span>
                </TableCell>
                <TableCell>
                  {getStatusBadge(transaction.type, transaction.verified)}
                </TableCell>
                <TableCell>
                  {!transaction.verified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerify(transaction.id)}
                      disabled={actionEnCours === transaction.id}
                    >
                      {actionEnCours === transaction.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Vérifier"
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}