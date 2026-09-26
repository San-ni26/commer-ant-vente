// lib/offline/queue.ts
// Utilitaires de haut niveau pour la file d'attente hors-ligne.
// Ré-exporte les primitives de db.ts et fournit des helpers typés.

import { ajouterALaQueue, type SyncQueueItem } from './db'

export type { SyncQueueItem }

/**
 * Paramètres attendus par les composants clients pour enqueuer une action.
 */
export interface ActionHorsLigne {
  /** URL de l'API à appeler lors de la synchronisation */
  url: string
  /** Méthode HTTP */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Corps de la requête (sérialisé en JSON) */
  body?: unknown
  /** Métadonnées libres pour identifier l'action (ex. { type: 'delete_vente', venteId }) */
  metadata?: Record<string, unknown>
  /** Étiquette optionnelle (ex. 'vente:supprimer') — générée automatiquement si absente */
  tag?: string
  /** ID temporaire local si une ressource a été créée hors-ligne */
  localId?: string
  /** Nombre max de tentatives (défaut : 5) */
  maxAttempts?: number
}

/**
 * Ajoute une action HTTP à la file d'attente de synchronisation hors-ligne.
 * Elle sera rejouée dès que le réseau sera disponible.
 *
 * @returns L'identifiant IDB de l'entrée créée.
 */
export async function ajouterActionHorsLigne(
  action: ActionHorsLigne
): Promise<number> {
  const { url, method, body, metadata, tag, localId, maxAttempts = 5 } = action

  // Génère un tag à partir de la méthode + URL si non fourni
  const resolvedTag =
    tag ?? `${method.toLowerCase()}:${url.split('/').filter(Boolean).join('_')}`

  const item: Omit<SyncQueueItem, 'id'> = {
    url,
    method,
    body: body ?? metadata ?? {},
    createdAt: Date.now(),
    attempts: 0,
    maxAttempts,
    tag: resolvedTag,
    localId,
  }

  return ajouterALaQueue(item)
}

// Ré-exporte les primitives utiles pour les autres modules
export {
  ajouterALaQueue,
  getQueue,
  supprimerDeQueue,
  mettreAJourQueue,
  viderQueue,
  compterQueue,
} from './db'
