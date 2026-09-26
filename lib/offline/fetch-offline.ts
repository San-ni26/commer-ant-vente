// lib/offline/fetch-offline.ts
// Utilitaire central pour toutes les mutations offline-first
// En ligne  : fetch direct → sauvegarder en IDB → notifier les hooks
// Hors ligne : optimistic update local → ajouter à la queue → sync au retour

import { ajouterALaQueue, type SyncQueueItem } from './db'

export type MutationOfflineOptions<TBody = unknown, TLocal = unknown> = {
  // Requête réseau
  url: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: TBody

  // Tag pour la queue (ex: 'boutique:creer', 'vente:supprimer')
  tag: string

  // ID temporaire si création hors ligne (ex: 'temp_boutique_...')
  localId?: string

  // Données locales optimistes à utiliser hors ligne
  donneeLocale?: TLocal

  // Callback appelé si le fetch réseau réussit (pour sauvegarder en IDB)
  onSuccess?: (data: unknown) => Promise<void>

  // Callback appelé pour l'optimistic update hors ligne
  onOffline?: (donneeLocale: TLocal) => void

  // Nombre max de tentatives en queue (défaut 5)
  maxAttempts?: number
}

export type MutationResult<T = unknown> =
  | { ok: true; data: T; source: 'network' }
  | { ok: true; data: null; source: 'offline' }
  | { ok: false; error: string; source: 'network' | 'offline' }

/**
 * Mutation offline-first universelle.
 * - En ligne  : fetch → callback onSuccess → { ok: true, source: 'network' }
 * - Hors ligne : optimistic update → queue → { ok: true, source: 'offline' }
 */
export async function mutationOffline<TBody = unknown, TLocal = unknown, TResponse = unknown>(
  opts: MutationOfflineOptions<TBody, TLocal>
): Promise<MutationResult<TResponse>> {
  const {
    url, method, body, tag, localId, donneeLocale,
    onSuccess, onOffline, maxAttempts = 5,
  } = opts

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  // ── Mode HORS LIGNE ────────────────────────────────────────────────────────
  if (!isOnline) {
    // Appliquer l'optimistic update dans l'UI
    if (onOffline && donneeLocale !== undefined) {
      onOffline(donneeLocale)
    }

    // Enregistrer dans la queue pour replay au retour réseau
    await ajouterALaQueue({
      method,
      url,
      body,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts,
      tag,
      localId,
    })

    return { ok: true, data: null, source: 'offline' }
  }

  // ── Mode EN LIGNE ──────────────────────────────────────────────────────────
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })

    if (!response.ok) {
      let erreur = `HTTP ${response.status}`
      try {
        const json = await response.json()
        erreur = json.erreur || json.message || erreur
      } catch {}
      return { ok: false, error: erreur, source: 'network' }
    }

    // Réponse vide (DELETE 204)
    let data: TResponse | null = null
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      data = await response.json()
    }

    // Sauvegarder en IDB en arrière-plan
    if (onSuccess && data !== null) {
      onSuccess(data).catch((err) =>
        console.error('[fetchOffline] Erreur sauvegarde IDB:', err)
      )
    }

    return { ok: true, data: data as TResponse, source: 'network' }
  } catch (err) {
    // Réseau coupé en cours de requête → basculer en mode offline
    if (onOffline && donneeLocale !== undefined) {
      onOffline(donneeLocale)
    }

    await ajouterALaQueue({
      method, url, body,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts,
      tag,
      localId,
    })

    return { ok: true, data: null, source: 'offline' }
  }
}
