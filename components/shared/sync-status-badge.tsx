// components/shared/sync-status-badge.tsx
// Badge compact affichant le nombre d'opérations en attente + bouton sync manuel
'use client'

import { useOnlineStatus } from '@/hooks/use-online-status'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SyncStatusBadge() {
  const isOnline = useOnlineStatus()
  const { pendingCount, isSyncing, forceSync } = useSyncStatus()

  // Ne rien afficher si en ligne et rien en attente
  if (isOnline && pendingCount === 0 && !isSyncing) return null

  return (
    <div className="flex items-center gap-1.5">
      {!isOnline && (
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium border border-red-200"
          title="Hors ligne"
        >
          <WifiOff className="h-3 w-3" />
          <span className="hidden sm:inline">Hors ligne</span>
        </div>
      )}

      {pendingCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={forceSync}
          disabled={isSyncing || !isOnline}
          className={cn(
            'flex items-center gap-1 h-7 px-2 text-xs rounded-full',
            'bg-amber-50 text-amber-700 border border-amber-200',
            'hover:bg-amber-100',
            'disabled:opacity-60'
          )}
          title={isOnline ? 'Synchroniser maintenant' : 'Reconnectez-vous pour synchroniser'}
        >
          {isSyncing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <CloudUpload className="h-3 w-3" />
          )}
          <span className="font-semibold">{pendingCount}</span>
          <span className="hidden sm:inline">
            {isSyncing ? 'Sync…' : `en attente`}
          </span>
        </Button>
      )}
    </div>
  )
}
