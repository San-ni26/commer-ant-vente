// hooks/use-boutiques.ts
// Hook boutiques avec support hors-ligne (IndexedDB + sync queue)
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  getBoutiquesLocales,
  saveBoutiquesLocales,
  saveBoutiqueLocale,
  ajouterALaQueue,
  type BoutiqueLocale,
} from '@/lib/offline/db'
import { fetchAvecCache } from '@/lib/offline/cache'
import { useOnlineStatus } from './use-online-status'
import { useSyncStatus } from './use-sync-status'

interface Boutique {
  id: string
  nom: string
  solde: number
  _count: {
    ventes: number
    transactions: number
    employes: number
  }
  gerant?: {
    id: string
    nom: string
    prenom: string
    email: string
  }
}

function toLocale(b: Boutique): BoutiqueLocale {
  return {
    ...b,
    dateCreation: new Date().toISOString(),
    dateMiseAJour: new Date().toISOString(),
    syncedAt: Date.now(),
  }
}

export function useBoutiques() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<'network' | 'cache' | null>(null)
  const isOnline = useOnlineStatus()
  const { refreshCount } = useSyncStatus()

  const chargerBoutiques = useCallback(async () => {
    setChargement(true)
    try {
      const { data, source: src } = await fetchAvecCache<Boutique[]>(
        '/api/boutiques',
        async () => {
          const locales = await getBoutiquesLocales()
          return locales as unknown as Boutique[]
        },
        async (data) => {
          const now = Date.now()
          await saveBoutiquesLocales(
            data.map((b) => ({ ...toLocale(b), syncedAt: now }))
          )
        }
      )
      setBoutiques(data)
      setSource(src)

      if (src === 'cache' && data.length > 0) {
        toast.info('Données locales affichées', {
          description: 'Vous êtes hors ligne. Reconnectez-vous pour synchroniser.',
          duration: 4000,
        })
      }
    } catch {
      toast.error('Impossible de charger les boutiques')
    } finally {
      setChargement(false)
    }
  }, [])

  const creerBoutique = async (donnees: { nom: string; gerantId?: string }) => {
    if (!isOnline) {
      // Hors ligne : créer un ID temporaire et mettre en queue
      const idTemp = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const boutiqueTmp: Boutique = {
        id: idTemp,
        nom: donnees.nom,
        solde: 0,
        _count: { ventes: 0, transactions: 0, employes: 0 },
      }

      // Afficher optimistiquement
      setBoutiques((prev) => [boutiqueTmp, ...prev])

      // Sauvegarder localement
      await saveBoutiqueLocale({ ...toLocale(boutiqueTmp), syncedAt: Date.now() })

      // Mettre en queue pour sync
      await ajouterALaQueue({
        method: 'POST',
        url: '/api/boutiques',
        body: donnees,
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 5,
        tag: 'boutique:creer',
        localId: idTemp,
      })

      await refreshCount()

      toast.warning('Boutique créée localement', {
        description: 'Elle sera synchronisée dès que vous serez connecté.',
      })

      return boutiqueTmp
    }

    // En ligne : appel API normal
    try {
      const reponse = await fetch('/api/boutiques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees),
      })

      if (!reponse.ok) throw new Error('Erreur lors de la création')

      const nouvelleBoutique: Boutique = await reponse.json()

      // Sauvegarder en IDB
      await saveBoutiqueLocale({ ...toLocale(nouvelleBoutique), syncedAt: Date.now() })

      setBoutiques((prev) => [nouvelleBoutique, ...prev])
      toast.success('Boutique créée avec succès')
      return nouvelleBoutique
    } catch {
      toast.error('Impossible de créer la boutique')
      return null
    }
  }

  const supprimerBoutique = async (id: string) => {
    if (!isOnline) {
      toast.error('Impossible de supprimer hors ligne', {
        description: 'Reconnectez-vous pour effectuer cette action.',
      })
      return
    }

    try {
      const reponse = await fetch(`/api/boutiques/${id}`, { method: 'DELETE' })
      if (!reponse.ok) throw new Error('Erreur lors de la suppression')

      setBoutiques((prev) => prev.filter((b) => b.id !== id))
      toast.success('Boutique supprimée avec succès')
    } catch {
      toast.error('Impossible de supprimer la boutique')
    }
  }

  // Recharger quand on revient en ligne
  useEffect(() => {
    if (isOnline && source === 'cache') {
      chargerBoutiques()
    }
  }, [isOnline, source, chargerBoutiques])

  useEffect(() => {
    chargerBoutiques()
  }, [chargerBoutiques])

  return {
    boutiques,
    chargement,
    source,
    isOnline,
    creerBoutique,
    supprimerBoutique,
    actualiser: chargerBoutiques,
  }
}