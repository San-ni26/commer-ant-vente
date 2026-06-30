// hooks/use-transactions-offline.ts
// Hook pour les transactions avec support hors-ligne complet
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  getTransactionsLocales,
  saveTransactionsLocales,
  saveTransactionLocale,
  ajouterALaQueue,
  type TransactionLocale,
} from '@/lib/offline/db'
import { fetchAvecCache } from '@/lib/offline/cache'
import { useOnlineStatus } from './use-online-status'
import { useSyncStatus } from './use-sync-status'

export type TypeTransaction =
  | 'VENTE'
  | 'VERSEMENT'
  | 'DEPENSE'
  | 'VIREMENT_BANCAIRE'
  | 'RETRAIT'

export interface Transaction {
  id: string
  type: TypeTransaction
  montant: number
  description?: string | null
  reference?: string | null
  boutiqueId: string
  verifiee: boolean
  verifieeParId?: string | null
  dateTransaction: string
  dateCreation: string
  enAttente?: boolean
}

export interface NouvelleTransaction {
  type: TypeTransaction
  montant: number
  description?: string
  reference?: string
  boutiqueId: string
}

function toLocale(t: Transaction): TransactionLocale {
  return { ...t, syncedAt: Date.now() }
}

export function useTransactionsOffline(boutiqueId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<'network' | 'cache' | null>(null)
  const isOnline = useOnlineStatus()
  const { refreshCount } = useSyncStatus()

  const chargerTransactions = useCallback(async () => {
    if (!boutiqueId) return
    setChargement(true)
    try {
      const { data, source: src } = await fetchAvecCache<Transaction[]>(
        `/api/boutiques/${boutiqueId}/transactions`,
        async () => {
          const locales = await getTransactionsLocales(boutiqueId)
          return locales as unknown as Transaction[]
        },
        async (data) => {
          const now = Date.now()
          await saveTransactionsLocales(
            data.map((t) => ({ ...toLocale(t), syncedAt: now }))
          )
        }
      )

      // Fusionner avec les transactions en attente locales
      const locales = await getTransactionsLocales(boutiqueId)
      const enAttente = locales.filter((t) => t.enAttente)
      const networkIds = new Set(data.map((t) => t.id))
      const transEnAttente = enAttente
        .filter((t) => !networkIds.has(t.id))
        .map((t) => ({ ...t, enAttente: true } as Transaction))

      setTransactions([...transEnAttente, ...data])
      setSource(src)
    } catch {
      const locales = await getTransactionsLocales(boutiqueId)
      setTransactions(locales as unknown as Transaction[])
      setSource('cache')
    } finally {
      setChargement(false)
    }
  }, [boutiqueId])

  const creerTransaction = async (
    donnees: NouvelleTransaction
  ): Promise<Transaction | null> => {
    if (!isOnline) {
      const idTemp = `temp_tx_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const txTmp: Transaction = {
        id: idTemp,
        type: donnees.type,
        montant: donnees.montant,
        description: donnees.description,
        reference: donnees.reference,
        boutiqueId: donnees.boutiqueId,
        verifiee: false,
        dateTransaction: new Date().toISOString(),
        dateCreation: new Date().toISOString(),
        enAttente: true,
      }

      setTransactions((prev) => [txTmp, ...prev])
      await saveTransactionLocale({ ...toLocale(txTmp), enAttente: true })

      await ajouterALaQueue({
        method: 'POST',
        url: `/api/boutiques/${donnees.boutiqueId}/transactions`,
        body: donnees,
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 5,
        tag: 'transaction:creer',
        localId: idTemp,
      })

      await refreshCount()

      toast.warning('Transaction enregistrée localement', {
        description: 'Elle sera synchronisée dès que vous serez connecté.',
        duration: 5000,
      })

      return txTmp
    }

    try {
      const reponse = await fetch(`/api/boutiques/${donnees.boutiqueId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees),
      })

      if (!reponse.ok) throw new Error('Erreur création transaction')

      const nouvelleTransaction: Transaction = await reponse.json()
      await saveTransactionLocale({
        ...toLocale(nouvelleTransaction),
        syncedAt: Date.now(),
      })
      setTransactions((prev) => [nouvelleTransaction, ...prev])
      toast.success('Transaction enregistrée avec succès')
      return nouvelleTransaction
    } catch {
      toast.error("Impossible d'enregistrer la transaction")
      return null
    }
  }

  useEffect(() => {
    if (isOnline && source === 'cache') {
      chargerTransactions()
    }
  }, [isOnline, source, chargerTransactions])

  useEffect(() => {
    chargerTransactions()
  }, [chargerTransactions])

  const transEnAttente = transactions.filter((t) => t.enAttente).length

  return {
    transactions,
    chargement,
    source,
    isOnline,
    transEnAttente,
    creerTransaction,
    actualiser: chargerTransactions,
  }
}
