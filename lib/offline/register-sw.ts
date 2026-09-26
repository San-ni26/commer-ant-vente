// lib/offline/register-sw.ts
// Enregistrement du service worker + écoute des messages SW

import { syncQueue } from './sync'

export async function enregistrerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none', // Toujours vérifier les mises à jour du SW
    })

    // Écouter les messages du service worker (SW_SYNC_REQUEST, SW_ACTIVE, etc.)
    navigator.serviceWorker.addEventListener('message', async (event) => {
      const { type } = event.data || {}

      if (type === 'SW_SYNC_REQUEST') {
        // Le SW demande de déclencher la sync (Background Sync API)
        await syncQueue()
      }

      if (type === 'SW_ACTIVE') {
        console.log('[SW] Service Worker actif:', event.data.version)
      }
    })

    return registration
  } catch (err) {
    console.warn('[SW] Enregistrement échoué:', err)
    return null
  }
}
