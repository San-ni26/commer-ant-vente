// hooks/use-sync-status.ts
// Expose l'état de synchronisation (pending count, syncing, lastSync)
'use client'

import { useState, useEffect, useCallback } from 'react'
import { compterQueue } from '@/lib/offline/db'
import { syncQueue, onSyncComplete, getIsSyncing } from '@/lib/offline/sync'

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

  const refreshCount = useCallback(async () => {
    try {
      const count = await compterQueue()
      setPendingCount(count)
    } catch {
      // IDB non disponible (SSR, etc.)
    }
  }, [])

  const forceSync = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await syncQueue()
      setLastSyncAt(Date.now())
      await refreshCount()
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, refreshCount])

  useEffect(() => {
    // Rafraîchir le compteur toutes les 5 secondes
    refreshCount()
    const interval = setInterval(refreshCount, 5000)

    // Écouter la fin des syncs
    const unsub = onSyncComplete(async (result) => {
      setLastSyncAt(Date.now())
      await refreshCount()
    })

    // Synchroniser l'état isSyncing
    const syncInterval = setInterval(() => {
      setIsSyncing(getIsSyncing())
    }, 500)

    return () => {
      clearInterval(interval)
      clearInterval(syncInterval)
      unsub()
    }
  }, [refreshCount])

  return { pendingCount, isSyncing, lastSyncAt, forceSync, refreshCount }
}
