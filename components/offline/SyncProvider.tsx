// components/offline/SyncProvider.tsx
// Provider global : enregistre le SW, orchestre la sync automatique au retour réseau
'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { syncQueue, enregistrerBackgroundSync } from '@/lib/offline/sync'
import { enregistrerServiceWorker } from '@/lib/offline/register-sw'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus()
  const wasOffline = useRef(false)
  const swRegistered = useRef(false)

  // Enregistrement du SW une seule fois au montage
  useEffect(() => {
    if (swRegistered.current) return
    swRegistered.current = true

    enregistrerServiceWorker().then((reg) => {
      if (reg) enregistrerBackgroundSync()
    })

    // Sync initiale au montage : rejouer les items en attente si on est en ligne
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncQueue().catch(() => {})
    }
  }, [])

  // Sync automatique au retour en ligne
  useEffect(() => {
    if (isOnline) {
      if (wasOffline.current) {
        // On vient de repasser en ligne
        wasOffline.current = false
        toast.info('Connexion rétablie — synchronisation en cours…', {
          duration: 3000,
          id: 'sync-reconnect',
        })

        syncQueue().then((result) => {
          if (result.success > 0) {
            toast.success(
              `${result.success} opération${result.success > 1 ? 's' : ''} synchronisée${result.success > 1 ? 's' : ''}`,
              { id: 'sync-success', duration: 4000 }
            )
          }
          if (result.failed > 0) {
            toast.error(
              `${result.failed} opération${result.failed > 1 ? 's' : ''} en échec`,
              { id: 'sync-error', duration: 5000 }
            )
          }
        })
      }
    } else {
      wasOffline.current = true
    }
  }, [isOnline])

  return <>{children}</>
}
