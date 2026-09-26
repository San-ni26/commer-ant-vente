// hooks/use-sync-status.ts
// État de synchronisation — event-driven (pas de polling)
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
      if (mounted.current) setLastSyncAt(Date.now())
      await refreshCount()
    } finally {
      if (mounted.current) setIsSyncing(false)
    }
  }, [isSyncing, refreshCount])

  useEffect(() => {
    mounted.current = true

    // Lecture initiale du compteur
    refreshCount()

    // Écouter la fin de chaque sync — mis à jour event-driven
    const unsub = onSyncComplete(async (result) => {
      if (!mounted.current) return
      setLastSyncAt(Date.now())
      setIsSyncing(false)
      // Rafraîchir après un court délai (IDB a besoin de terminer ses writes)
      setTimeout(refreshCount, 100)
    })

    // Rafraîchir toutes les 10s (failsafe uniquement — pas pour isSyncing)
    const interval = setInterval(refreshCount, 10_000)

    return () => {
      mounted.current = false
      unsub()
      clearInterval(interval)
    }
  }, [refreshCount])

  return { pendingCount, isSyncing, lastSyncAt, forceSync, refreshCount }
}
