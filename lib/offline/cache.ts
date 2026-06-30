// lib/offline/cache.ts
// Helper fetchWithCache : réseau d'abord → fallback IndexedDB

/**
 * Récupère des données depuis l'API et les stocke en IDB.
 * Si hors ligne ou erreur réseau, retourne les données IDB.
 *
 * @param url          URL de l'API
 * @param getLocal     Fonction qui lit depuis IDB
 * @param saveLocal    Fonction qui écrit dans IDB (reçoit les données de l'API)
 * @returns            Les données (réseau ou IDB)
 */
export async function fetchAvecCache<T>(
  url: string,
  getLocal: () => Promise<T>,
  saveLocal: (data: T) => Promise<void>,
  options?: RequestInit
): Promise<{ data: T; source: 'network' | 'cache' }> {
  // Si hors ligne : directement le cache local
  if (typeof window !== 'undefined' && !navigator.onLine) {
    const localData = await getLocal()
    return { data: localData, source: 'cache' }
  }

  try {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store', // toujours frais depuis le réseau
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data: T = await response.json()

    // Stocker en IDB en arrière-plan (ne pas bloquer le retour)
    saveLocal(data).catch((err) =>
      console.error('[Cache] Erreur sauvegarde IDB:', err)
    )

    return { data, source: 'network' }
  } catch {
    // Réseau KO → fallback local
    const localData = await getLocal()
    return { data: localData, source: 'cache' }
  }
}
