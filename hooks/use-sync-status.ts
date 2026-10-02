// hooks/use-sync-status.ts
// État de synchronisation — event-driven (pas de polling agressif)
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { compterQueue } from '@/lib/offline/db'
import { syncQueue, onSyncComplete } from '@/lib/offline/sync'

export interface SyncStatus {
  pendingCount: number
  isSyncing: boolean
  lastSyncAt: number | null
  forceSync: () => Promise<void>
  refreshCount: () => Promise<void>
}

export function useSyncStatus(): SyncStatus {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const mounted = useRef(true)
  // Garde en mémoire le dernier pendingCount pour ne mettre à jour lastSyncAt
  // que si des éléments ont vraiment été synchronisés
  const prevPendingCount = useRef(0)

  const refreshCount = useCallback(async () => {
    try {
      const count = await compterQueue()
      if (mounted.current) setPendingCount(count)
    } catch {
      // IDB non disponible (SSR)
    }
  }, [])

  const forceSync = useCallback(async () => {
    if (isSyncing) return
    if (mounted.current) setIsSyncing(true)
    try {
      await syncQueue()
      await refreshCount()
    } finally {
      if (mounted.current) setIsSyncing(false)
    }
  }, [isSyncing, refreshCount])

  useEffect(() => {
    mounted.current = true

    // Lecture initiale du compteur
    refreshCount()

    // Écouter la fin de chaque sync uniquement — pas de polling
    const unsub = onSyncComplete(async (result) => {
      if (!mounted.current) return
      setIsSyncing(false)
      if (result && (result.success > 0 || result.failed > 0)) {
        setLastSyncAt(Date.now())
      }
      setTimeout(refreshCount, 100)
    })

    return () => {
      mounted.current = false
      unsub()
    }
  }, [refreshCount])

  // Détecter une vraie sync (pendingCount qui diminue)
  useEffect(() => {
    if (prevPendingCount.current > 0 && pendingCount === 0 && !isSyncing) {
      setLastSyncAt(Date.now())
    }
    prevPendingCount.current = pendingCount
  }, [pendingCount, isSyncing])

  return { pendingCount, isSyncing, lastSyncAt, forceSync, refreshCount }
}
