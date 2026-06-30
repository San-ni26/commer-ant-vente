// hooks/use-ventes-offline.ts
// Hook pour les ventes avec support hors-ligne complet
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  getVentesLocales,
  saveVentesLocales,
  saveVenteLocale,
  deleteVenteLocale,
  ajouterALaQueue,
  type VenteLocale,
} from '@/lib/offline/db'
import { fetchAvecCache } from '@/lib/offline/cache'
import { useOnlineStatus } from './use-online-status'
import { useSyncStatus } from './use-sync-status'

export interface Vente {
  id: string
  montant: number
  description?: string | null
  boutiqueId: string
  enregistreParId: string
  dateVente: string
  dateCreation: string
  enregistrePar?: { nom: string; prenom: string }
  enAttente?: boolean
}

export interface NouvelleVente {
  montant: number
  description?: string
  boutiqueId: string
}

function toLocale(v: Vente): VenteLocale {
  return { ...v, syncedAt: Date.now() }
}

export function useVentesOffline(boutiqueId: string) {
  const [ventes, setVentes] = useState<Vente[]>([])
  const [chargement, setChargement] = useState(true)
  const [source, setSource] = useState<'network' | 'cache' | null>(null)
  const isOnline = useOnlineStatus()
  const { refreshCount } = useSyncStatus()

  const chargerVentes = useCallback(async () => {
    if (!boutiqueId) return
    setChargement(true)
    try {
      const { data, source: src } = await fetchAvecCache<Vente[]>(
        `/api/boutiques/${boutiqueId}/ventes`,
        async () => {
          const locales = await getVentesLocales(boutiqueId)
          return locales as unknown as Vente[]
        },
        async (data) => {
          const now = Date.now()
          await saveVentesLocales(
            data.map((v) => ({ ...toLocale(v), syncedAt: now }))
          )
        }
      )
      // Fusionner avec les ventes en attente locales
      const locales = await getVentesLocales(boutiqueId)
      const enAttente = locales.filter((v) => v.enAttente)
      const networkIds = new Set(data.map((v) => v.id))
      const ventesEnAttente = enAttente
        .filter((v) => !networkIds.has(v.id))
        .map((v) => ({ ...v, enAttente: true } as Vente))

      setVentes([...ventesEnAttente, ...data])
      setSource(src)
    } catch {
      // Fallback complet sur IDB
      const locales = await getVentesLocales(boutiqueId)
      setVentes(locales as unknown as Vente[])
      setSource('cache')
    } finally {
      setChargement(false)
    }
  }, [boutiqueId])

  const creerVente = async (donnees: NouvelleVente): Promise<Vente | null> => {
    if (!isOnline) {
      // Hors ligne : ID temporaire + queue
      const idTemp = `temp_vente_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const venteTmp: Vente = {
        id: idTemp,
        montant: donnees.montant,
        description: donnees.description,
        boutiqueId: donnees.boutiqueId,
        enregistreParId: '',
        dateVente: new Date().toISOString(),
        dateCreation: new Date().toISOString(),
        enAttente: true,
      }

      // Affichage optimiste
      setVentes((prev) => [venteTmp, ...prev])

      // Sauvegarder en IDB
      await saveVenteLocale({ ...toLocale(venteTmp), enAttente: true })

      // Mettre en queue
      await ajouterALaQueue({
        method: 'POST',
        url: `/api/boutiques/${donnees.boutiqueId}/ventes`,
        body: donnees,
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: 5,
        tag: 'vente:creer',
        localId: idTemp,
      })

      await refreshCount()

      toast.warning('Vente enregistrée localement', {
        description: 'Elle sera synchronisée dès que vous serez connecté.',
        duration: 5000,
      })

      return venteTmp
    }

    // En ligne : appel API
    try {
      const reponse = await fetch(`/api/boutiques/${donnees.boutiqueId}/ventes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donnees),
      })

      if (!reponse.ok) throw new Error('Erreur création vente')

      const nouvelleVente: Vente = await reponse.json()
      await saveVenteLocale({ ...toLocale(nouvelleVente), syncedAt: Date.now() })
      setVentes((prev) => [nouvelleVente, ...prev])
      toast.success('Vente enregistrée avec succès')
      return nouvelleVente
    } catch {
      toast.error('Impossible d\'enregistrer la vente')
      return null
    }
  }

  const supprimerVenteLocaleTemp = async (id: string) => {
    await deleteVenteLocale(id)
    setVentes((prev) => prev.filter((v) => v.id !== id))
  }

  // Recharger dès qu'on revient en ligne
  useEffect(() => {
    if (isOnline && source === 'cache') {
      chargerVentes()
    }
  }, [isOnline, source, chargerVentes])

  useEffect(() => {
    chargerVentes()
  }, [chargerVentes])

  const totalVentes = ventes
    .filter((v) => !v.enAttente)
    .reduce((s, v) => s + v.montant, 0)

  const ventesEnAttente = ventes.filter((v) => v.enAttente).length

  return {
    ventes,
    chargement,
    source,
    isOnline,
    totalVentes,
    ventesEnAttente,
    creerVente,
    supprimerVenteLocaleTemp,
    actualiser: chargerVentes,
  }
}
