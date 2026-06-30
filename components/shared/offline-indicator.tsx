// components/shared/offline-indicator.tsx
// Bannière de statut réseau + synchronisation — apparaît uniquement quand nécessaire
'use client'

import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react'
import { cn } from '@/lib/utils'

type BannerState = 'offline' | 'syncing' | 'synced' | 'hidden'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const { pendingCount, isSyncing, lastSyncAt } = useSyncStatus()
  const [bannerState, setBannerState] = useState<BannerState>('hidden')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (!isOnline) {
      setBannerState('offline')
      return
    }

    if (isSyncing) {
      setBannerState('syncing')
      return
    }

    if (isOnline && lastSyncAt && pendingCount === 0) {
      // Vient de terminer une sync → montrer "synchronisé" 3 secondes
      setBannerState('synced')
      const timer = setTimeout(() => setBannerState('hidden'), 3000)
      return () => clearTimeout(timer)
    }

    if (isOnline && pendingCount > 0) {
      // En ligne mais données en attente
      setBannerState('syncing')
      return
    }

    setBannerState('hidden')
  }, [isOnline, isSyncing, pendingCount, lastSyncAt, mounted])

  if (!mounted || bannerState === 'hidden') return null

  const configs = {
    offline: {
      bg: 'bg-red-600',
      border: 'border-red-700',
      icon: <WifiOff className="h-4 w-4 shrink-0" />,
      text: pendingCount > 0
        ? `Hors ligne — ${pendingCount} opération${pendingCount > 1 ? 's' : ''} en attente`
        : 'Vous êtes hors ligne — données locales affichées',
    },
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
        'fixed top-0 left-0 right-0 z-50',
        'flex items-center justify-center gap-2',
        'px-4 py-2 text-sm font-medium text-white',
        'shadow-md border-b transition-all duration-300',
        config.bg,
        config.border,
        // Animation d'entrée
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
