// lib/offline/sync.ts
// Moteur de synchronisation : rejoue la queue offline quand le réseau revient

import {
  getQueue,
  supprimerDeQueue,
  mettreAJourQueue,
  type SyncQueueItem,
} from './db'

export type SyncResult = {
  success: number
  failed: number
  errors: Array<{ item: SyncQueueItem; error: string }>
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

let isSyncing = false

/**
 * Rejoue toutes les opérations en attente dans la queue.
 * Appelé automatiquement à la reconnexion et au démarrage si en ligne.
 */
export async function syncQueue(): Promise<SyncResult> {
  if (isSyncing) {
    return { success: 0, failed: 0, errors: [] }
  }

  if (typeof window === 'undefined') {
    return { success: 0, failed: 0, errors: [] }
  }

  if (!navigator.onLine) {
    return { success: 0, failed: 0, errors: [] }
  }

  isSyncing = true
  const queue = await getQueue()

  const result: SyncResult = { success: 0, failed: 0, errors: [] }

  // Traiter en série (FIFO) pour éviter les conflits
  for (const item of queue) {
    if (!item.id) continue

    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
        // Important: pas de cache pour les mutations de sync
        cache: 'no-store',
      })

      if (response.ok) {
        // Succès : supprimer de la queue
        await supprimerDeQueue(item.id)
        result.success++
      } else {
        // Erreur serveur (4xx, 5xx)
        const errMsg = `HTTP ${response.status}`

        if (response.status >= 400 && response.status < 500) {
          // Erreur client (données invalides, conflit) → supprimer après max tentatives
          item.attempts++
          if (item.attempts >= item.maxAttempts) {
            await supprimerDeQueue(item.id)
            result.errors.push({ item, error: `Abandon après ${item.maxAttempts} tentatives: ${errMsg}` })
          } else {
            await mettreAJourQueue({ ...item, attempts: item.attempts })
          }
        } else {
          // Erreur serveur → incrémenter les tentatives
          item.attempts++
          await mettreAJourQueue({ ...item, attempts: item.attempts })
          result.errors.push({ item, error: errMsg })
        }
        result.failed++
      }
    } catch {
      // Erreur réseau → incrémenter les tentatives
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
 * Enregistre la queue pour Background Sync API (si supportée par le navigateur).
 * Fallback : sync au moment de la reconnexion via événement `online`.
 */
export async function enregistrerBackgroundSync(): Promise<void> {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      // @ts-ignore — SyncManager peut ne pas être typé
      await registration.sync.register('sync-queue')
    } catch (err) {
      console.warn('[Sync] Background Sync non disponible, fallback sur événement online:', err)
    }
  }
}
