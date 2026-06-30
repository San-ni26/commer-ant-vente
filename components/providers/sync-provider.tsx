// components/providers/sync-provider.tsx
// Context Provider qui orchestre la synchronisation offline au niveau de l'app
'use client'

import { createContext, useContext, useEffect, useCallback, useState } from 'react'
import { toast } from 'sonner'
import { syncQueue, enregistrerBackgroundSync, onSyncComplete } from '@/lib/offline/sync'
import { compterQueue } from '@/lib/offline/db'

interface SyncContextValue {
  pendingCount: number
  isSyncing: boolean
  lastSyncAt: number | null
  forceSync: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue>({
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  forceSync: async () => {},
})

export function useSyncContext() {
  return useContext(SyncContext)
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)

  const refreshCount = useCallback(async () => {
    try {
      const count = await compterQueue()
      setPendingCount(count)
    } catch { /* IDB non disponible */ }
  }, [])

  const forceSync = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return
    setIsSyncing(true)
    try {
      const result = await syncQueue()
      if (result.success > 0) {
        toast.success(`${result.success} opération${result.success > 1 ? 's' : ''} synchronisée${result.success > 1 ? 's' : ''}`, {
          description: 'Vos données sont maintenant à jour.',
          duration: 4000,
        })
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} opération${result.failed > 1 ? 's' : ''} échouée${result.failed > 1 ? 's' : ''}`, {
          description: 'Certaines données n\'ont pas pu être synchronisées.',
        })
      }
      setLastSyncAt(Date.now())
    } finally {
      setIsSyncing(false)
      await refreshCount()
    }
  }, [isSyncing, refreshCount])

  useEffect(() => {
    // Lancer la sync au démarrage si en ligne
    if (typeof window === 'undefined') return

    refreshCount()

    if (navigator.onLine) {
      // Sync initiale silencieuse (sans toast si rien en attente)
      compterQueue().then((count) => {
        if (count > 0) forceSync()
      })
    }

    // Enregistrer Background Sync API
    enregistrerBackgroundSync()

    // Écouter la reconnexion
    const handleOnline = () => {
      toast.info('Connexion rétablie', {
        description: 'Synchronisation des données en cours…',
        duration: 3000,
      })
      setTimeout(() => forceSync(), 1000) // légère pause avant de sync
    }

    // Écouter les messages du Service Worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_SYNC_COMPLETE') {
        refreshCount()
        setLastSyncAt(Date.now())
      }
      if (event.data?.type === 'SW_ONLINE') {
        forceSync()
      }
    }

    window.addEventListener('online', handleOnline)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage)
    }

    // Écouter les fins de sync
    const unsubSync = onSyncComplete(async () => {
      await refreshCount()
    })

    // Rafraîchir le compteur périodiquement
    const interval = setInterval(refreshCount, 10000)

    return () => {
      window.removeEventListener('online', handleOnline)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage)
      }
      unsubSync()
      clearInterval(interval)
    }
  }, [forceSync, refreshCount])

  return (
    <SyncContext.Provider value={{ pendingCount, isSyncing, lastSyncAt, forceSync }}>
      {children}
    </SyncContext.Provider>
  )
}
