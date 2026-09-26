// components/shared/offline-indicator.tsx
// Bannière de statut réseau + synchronisation — apparaît uniquement quand nécessaire
'use client'

import { useEffect, useState, useRef } from 'react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react'
import { cn } from '@/lib/utils'

type BannerState = 'syncing' | 'synced' | 'hidden'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const { pendingCount, isSyncing, lastSyncAt } = useSyncStatus()
  const [bannerState, setBannerState] = useState<BannerState>('hidden')
  const [mounted, setMounted] = useState(false)
  // Mémoriser si on avait des éléments en attente avant la sync
  const hadPendingItems = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Tracker les items en attente
  useEffect(() => {
    if (pendingCount > 0) {
      hadPendingItems.current = true
    }
  }, [pendingCount])

  useEffect(() => {
    if (!mounted) return

    // Pas de bande rouge — mode hors ligne silencieux
    if (!isOnline) {
      setBannerState('hidden')
      return
    }

    if (isSyncing) {
      setBannerState('syncing')
      return
    }

    // "Synchronisé" UNIQUEMENT si on avait des items en attente qui sont maintenant traités
    if (isOnline && lastSyncAt && pendingCount === 0 && hadPendingItems.current) {
      hadPendingItems.current = false
      setBannerState('synced')
      const timer = setTimeout(() => setBannerState('hidden'), 3000)
      return () => clearTimeout(timer)
    }

    if (isOnline && pendingCount > 0) {
      setBannerState('syncing')
      return
    }

    setBannerState('hidden')
  }, [isOnline, isSyncing, pendingCount, lastSyncAt, mounted])

  if (!mounted || bannerState === 'hidden') return null

  const configs: Record<BannerState, { bg: string; border: string; icon: React.ReactNode; text: string }> = {
    syncing: {
      bg: 'bg-amber-500',
      border: 'border-amber-600',
      icon: <CloudUpload className="h-4 w-4 shrink-0 animate-pulse" />,
      text: `Synchronisation en cours… (${pendingCount} élément${pendingCount > 1 ? 's' : ''})`,
    },
    synced: {
      bg: 'bg-emerald-600',
      border: 'border-emerald-700',
      icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
      text: 'Données synchronisées avec succès',
    },
    hidden: {
      bg: '',
      border: '',
      icon: null,
      text: '',
    },
  }

  const config = configs[bannerState]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-0 left-0 right-0 z-40',
        'flex items-center justify-center gap-2',
        'px-4 py-2 text-sm font-medium text-white',
        'shadow-lg border-b transition-all duration-300',
        config.bg,
        config.border,
        'animate-in slide-in-from-top-2 duration-300'
      )}
    >
      {config.icon}
      <span>{config.text}</span>
      {bannerState === 'syncing' && (
        <RefreshCw className="h-3.5 w-3.5 animate-spin ml-1" />
      )}
    </div>
  )
}
