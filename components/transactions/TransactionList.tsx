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

export function TransactionList({ shopId }: { shopId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    fetchTransactions()
  }, [shopId])

  const fetchTransactions = async () => {
    try {
      setChargement(true)
      const reponse = await fetch(`/api/boutiques/${shopId}/transactions`)
      if (!reponse.ok) throw new Error("Erreur de chargement")
      const donnees = await reponse.json()
      setTransactions(donnees)
    } catch (erreur) {
      console.error("Erreur:", erreur)
    } finally {
      setChargement(false)
    }
  }

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
    try {
      const reponse = await fetch(`/api/boutiques/${shopId}/transactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, verified: true })
      })
      
      if (reponse.ok) {
        fetchTransactions()
      }
    } catch (erreur) {
      console.error("Erreur lors de la vérification:", erreur)
    }
  }

  if (chargement) {
    return <div className="text-center py-8">Chargement...</div>
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune transaction trouvée
      </div>
    )
  }

  return (
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
                  {transaction.amount.toFixed(2)} €
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
                  >
                    Vérifier
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}