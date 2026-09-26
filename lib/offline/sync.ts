// lib/offline/sync.ts
// Moteur de synchronisation : rejoue la queue offline quand le réseau revient

import {
  getQueue,
  supprimerDeQueue,
  mettreAJourQueue,
  replaceLocalId,
  type SyncQueueItem,
} from './db'

export type SyncResult = {
  success: number
  failed: number
  errors: Array<{ item: SyncQueueItem; error: string }>
  // Map localId → realId pour que les hooks puissent mettre à jour leur état
  idMappings: Record<string, string>
}

type SyncListener = (result: SyncResult) => void
const listeners: SyncListener[] = []

export function onSyncComplete(fn: SyncListener): () => void {
  listeners.push(fn)
  return () => {
    const idx = listeners.indexOf(fn)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}

function notifyListeners(result: SyncResult) {
  listeners.forEach((fn) => fn(result))
}

// Émis item par item pour les résolutions immédiates dans les hooks
type ItemSyncedListener = (localId: string, realId: string, tag: string) => void
const itemListeners: ItemSyncedListener[] = []

export function onItemSynced(fn: ItemSyncedListener): () => void {
  itemListeners.push(fn)
  return () => {
    const idx = itemListeners.indexOf(fn)
    if (idx !== -1) itemListeners.splice(idx, 1)
  }
}

let isSyncing = false

/**
 * Rejoue toutes les opérations en attente dans la queue.
 * Appelé automatiquement à la reconnexion et via Background Sync.
 */
export async function syncQueue(): Promise<SyncResult> {
  if (isSyncing) return { success: 0, failed: 0, errors: [], idMappings: {} }
  if (typeof window === 'undefined') return { success: 0, failed: 0, errors: [], idMappings: {} }
  if (!navigator.onLine) return { success: 0, failed: 0, errors: [], idMappings: {} }

  isSyncing = true
  const queue = await getQueue()
  const result: SyncResult = { success: 0, failed: 0, errors: [], idMappings: {} }

  // Traitement FIFO en série pour éviter les conflits d'ordre
  for (const item of queue) {
    if (!item.id) continue

    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
        cache: 'no-store',
      })

      if (response.ok) {
        await supprimerDeQueue(item.id)
        result.success++

        // Résolution de l'ID temporaire → ID réel
        if (item.localId) {
          try {
            const body = await response.json()
            const realId: string | undefined = body?.id

            if (realId && realId !== item.localId) {
              // Remplacer dans IDB
              const store = item.tag.startsWith('vente')
                ? 'ventes'
                : item.tag.startsWith('transaction')
                ? 'transactions'
                : null

              if (store) {
                await replaceLocalId(store, item.localId, realId)
              }

              // Notifier les hooks React
              result.idMappings[item.localId] = realId
              itemListeners.forEach((fn) => fn(item.localId!, realId, item.tag))
            }
          } catch {
            // Le corps de la réponse peut déjà avoir été consommé — pas bloquant
          }
        }
      } else {
        const errMsg = `HTTP ${response.status}`
        item.attempts++

        if (response.status >= 400 && response.status < 500) {
          // Erreur client définitive → abandon après maxAttempts
          if (item.attempts >= item.maxAttempts) {
            await supprimerDeQueue(item.id)
            result.errors.push({ item, error: `Abandon: ${errMsg}` })
          } else {
            await mettreAJourQueue({ ...item, attempts: item.attempts })
          }
        } else {
          await mettreAJourQueue({ ...item, attempts: item.attempts })
          result.errors.push({ item, error: errMsg })
        }
        result.failed++
      }
    } catch {
      item.attempts++
      if (item.attempts >= item.maxAttempts) {
        await supprimerDeQueue(item.id!)
        result.errors.push({ item, error: 'Max tentatives atteint' })
      } else {
        await mettreAJourQueue({ ...item, attempts: item.attempts })
        result.errors.push({ item, error: 'Erreur réseau' })
      }
      result.failed++
    }
  }

  isSyncing = false
  notifyListeners(result)
  return result
}

export function getIsSyncing(): boolean {
  return isSyncing
}

/**
 * Enregistre le Background Sync tag auprès du Service Worker.
 * Fallback : écoute l'événement `online` pour déclencher syncQueue directement.
 */
export async function enregistrerBackgroundSync(): Promise<void> {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      // @ts-ignore
      await registration.sync.register('sync-queue')
      return
    } catch {
      // Background Sync non disponible → fallback ci-dessous
    }
  }

  // Fallback : sync directe à la reconnexion réseau
  const handleOnline = async () => {
    await syncQueue()
    window.removeEventListener('online', handleOnline)
  }
  window.addEventListener('online', handleOnline, { once: true })
}
