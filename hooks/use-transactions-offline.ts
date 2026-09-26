// hooks/use-transactions-offline.ts
// Hook pour les transactions avec support hors-ligne complet
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  getTransactionsLocales,
  saveTransactionsLocales,
  saveTransactionLocale,
  deleteTransactionLocale,
  ajouterALaQueue,
  type TransactionLocale,
} from '@/lib/offline/db'
import { onItemSynced } from '@/lib/offline/sync'
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

export interface TotauxTransactions {
  totalVersements: number
  totalDepenses: number
  enAttente: number
}

export function useTransactionsOffline(boutiqueId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totaux, setTotaux] = useState<TotauxTransactions>({ totalVersements: 0, totalDepenses: 0, enAttente: 0 })
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<'network' | 'cache' | null>(null)
  const isOnline = useOnlineStatus()
  const { refreshCount } = useSyncStatus()
  const mounted = useRef(true)

  const chargerTransactions = useCallback(async () => {
    if (!boutiqueId) return
    setChargement(true)
    try {
      let txList: Transaction[] = []
      let totauxData: TotauxTransactions = { totalVersements: 0, totalDepenses: 0, enAttente: 0 }
      let src: 'network' | 'cache' = 'network'

      if (typeof window !== 'undefined' && !navigator.onLine) {
        // Hors ligne : lire depuis IndexedDB
        const locales = await getTransactionsLocales(boutiqueId)
        txList = locales.filter(t => t.type === "VERSEMENT" || t.type === "DEPENSE") as unknown as Transaction[]
        totauxData = {
          totalVersements: txList.filter(t => t.type === "VERSEMENT" && t.verifiee).reduce((s, t) => s + t.montant, 0),
          totalDepenses: txList.filter(t => t.type === "DEPENSE" && t.verifiee).reduce((s, t) => s + t.montant, 0),
          enAttente: txList.filter(t => !t.verifiee).length,
        }
        src = 'cache'
      } else {
        try {
          const response = await fetch(`/api/boutiques/${boutiqueId}/transactions`, { cache: 'no-store' })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)

          const json = await response.json()
          txList = json.transactions ?? []
          totauxData = json.totaux ?? { totalVersements: 0, totalDepenses: 0, enAttente: 0 }
          src = 'network'

          // Sauvegarder en IndexedDB en arrière-plan
          const now = Date.now()
          saveTransactionsLocales(
            txList.map((t) => ({ ...toLocale(t), syncedAt: now }))
          ).catch(() => {})
        } catch {
          // Réseau KO → fallback IndexedDB
          const locales = await getTransactionsLocales(boutiqueId)
          txList = locales.filter(t => t.type === "VERSEMENT" || t.type === "DEPENSE") as unknown as Transaction[]
          totauxData = {
            totalVersements: txList.filter(t => t.type === "VERSEMENT" && t.verifiee).reduce((s, t) => s + t.montant, 0),
            totalDepenses: txList.filter(t => t.type === "DEPENSE" && t.verifiee).reduce((s, t) => s + t.montant, 0),
            enAttente: txList.filter(t => !t.verifiee).length,
          }
          src = 'cache'
        }
      }

      // Fusionner avec les transactions en attente locales
      const locales = await getTransactionsLocales(boutiqueId)
      const enAttenteLocales = locales.filter((t) => t.enAttente)
      const networkIds = new Set(txList.map((t) => t.id))
      const transEnAttenteList = enAttenteLocales
        .filter((t) => !networkIds.has(t.id))
        .map((t) => ({ ...t, enAttente: true } as Transaction))

      if (mounted.current) {
        setTransactions([...transEnAttenteList, ...txList])
        setTotaux({
          totalVersements: totauxData.totalVersements,
          totalDepenses: totauxData.totalDepenses,
          enAttente: totauxData.enAttente + transEnAttenteList.length,
        })
        setSource(src)
      }
    } catch (err) {
      console.error('[Transactions] Erreur chargement:', err)
      const locales = await getTransactionsLocales(boutiqueId)
      const txLocales = locales as unknown as Transaction[]
      if (mounted.current) {
        setTransactions(txLocales)
        setTotaux({
          totalVersements: txLocales.filter(t => t.type === "VERSEMENT" && t.verifiee).reduce((s, t) => s + t.montant, 0),
          totalDepenses: txLocales.filter(t => t.type === "DEPENSE" && t.verifiee).reduce((s, t) => s + t.montant, 0),
          enAttente: txLocales.filter(t => !t.verifiee).length,
        })
        setSource('cache')
      }
    } finally {
      if (mounted.current) setChargement(false)
    }
  }, [boutiqueId])

  // Résolution des IDs temporaires quand la sync réussit
  useEffect(() => {
    const unsub = onItemSynced((localId, realId, tag) => {
      if (!tag.startsWith('transaction')) return
      if (!mounted.current) return

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === localId
            ? { ...t, id: realId, enAttente: false }
            : t
        )
      )
    })

    return () => unsub()
  }, [])

  // Recharger dès qu'on revient en ligne
  useEffect(() => {
    if (isOnline && source === 'cache') {
      chargerTransactions()
    }
  }, [isOnline, source, chargerTransactions])

  useEffect(() => {
    mounted.current = true
    chargerTransactions()
    return () => { mounted.current = false }
  }, [chargerTransactions])

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

      // Affichage optimiste immédiat
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
        description: 'Elle sera synchronisée dès la reconnexion.',
        duration: 5000,
      })

      return txTmp
    }

    // En ligne : appel API direct
    try {
      const reponse = await fetch(`/api/boutiques/${donnees.boutiqueId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees),
      })

      if (!reponse.ok) throw new Error('Erreur création transaction')

      const nouvelleTransaction: Transaction = await reponse.json()
      await saveTransactionLocale({ ...toLocale(nouvelleTransaction), syncedAt: Date.now() })
      setTransactions((prev) => [nouvelleTransaction, ...prev])
      toast.success('Transaction enregistrée avec succès')
      return nouvelleTransaction
    } catch {
      toast.error("Impossible d'enregistrer la transaction")
      return null
    }
  }

  const supprimerTransactionLocaleTemp = async (id: string) => {
    await deleteTransactionLocale(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const transEnAttenteCount = transactions.filter((t) => t.enAttente).length

  return {
    transactions,
    totaux,
    chargement,
    source,
    isOnline,
    transEnAttente: transEnAttenteCount,
    creerTransaction,
    supprimerTransactionLocaleTemp,
    actualiser: chargerTransactions,
  }
}
