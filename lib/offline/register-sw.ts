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

    // Forcer l'activation immédiate si une nouvelle version est en attente
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Nouveau SW installé → activer immédiatement
          newWorker.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    })

    // Recharger quand le SW change (pour appliquer le nouveau cache)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        // Ne pas recharger automatiquement — évite les surprises utilisateur
        console.log('[SW] Nouveau Service Worker activé (v8)')
      }
    })

    // Écouter les messages du service worker
    navigator.serviceWorker.addEventListener('message', async (event) => {
      const { type } = event.data || {}

      if (type === 'SW_SYNC_REQUEST') {
        // Le SW demande de déclencher la sync
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
