// hooks/use-online-status.ts
// Détection de connectivité réseau — compatible Chrome, Safari, Firefox, iOS
//
// Stratégie : ping réel vers /api/health (fetch avec timeout).
// On n'utilise PAS navigator.onLine comme seule source de vérité car :
//   - Safari retourne true tant qu'une interface réseau existe (WiFi/4G connecté
//     au routeur) même si l'accès Internet est coupé.
//   - Le mode "offline" de Chrome DevTools force navigator.onLine = false, mais
//     la coupure Internet réelle sur Safari ne le change pas.
// Solution : vérification par fetch réelle avec AbortController timeout.
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const PING_URL      = '/api/health'
const PING_INTERVAL = 8_000   // vérification toutes les 8 secondes
const PING_TIMEOUT  = 4_000   // 4s max — délai réaliste pour Safari sur réseau lent

/**
 * Vérifie la connectivité Internet réelle via un HEAD sur /api/health.
 * Fonctionne sur Chrome (DevTools offline), Safari (coupure réseau), iOS.
 */
async function verifierConnectivite(): Promise<boolean> {
  if (typeof window === 'undefined') return true

  // navigator.onLine = false → offline certain (Chrome DevTools, coupure franche)
  // navigator.onLine = true  → INCERTAIN sur Safari → toujours confirmer par fetch
  if (navigator.onLine === false) return false

  try {
    const controller = new AbortController()
    // Timeout strict : si le réseau est coupé, Safari attend ~75s par défaut
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT)

    const response = await fetch(`${PING_URL}?t=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
      // Contourner le Service Worker pour éviter de recevoir une réponse cachée
      // ce qui masquerait une vraie coupure réseau
      headers: { 'X-Ping': '1' },
    })

    clearTimeout(timer)
    return response.ok
  } catch {
    // AbortError (timeout) ou TypeError (réseau mort) → hors ligne
    return false
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    // Initialisation prudente : on suppose online, le ping initial corrigera
    return true
  })

  const mounted = useRef(true)
  const pingRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkAndSet = useCallback(async () => {
    const online = await verifierConnectivite()
    if (mounted.current) setIsOnline(online)
  }, [])

  const startPolling = useCallback(() => {
    if (pingRef.current) clearInterval(pingRef.current)
    pingRef.current = setInterval(checkAndSet, PING_INTERVAL)
  }, [checkAndSet])

  useEffect(() => {
    mounted.current = true

    // Ping immédiat au montage
    checkAndSet()
    startPolling()

    // Événements natifs : déclenchent un ping immédiat
    // Sur Safari : 'offline' se déclenche parfois tard — le ping régulier prend le relais
    const handleOnline  = () => checkAndSet()
    const handleOffline = () => {
      if (mounted.current) setIsOnline(false)
      // Relancer le polling plus agressif après coupure détectée
      checkAndSet()
    }

    // Visibilité : repinguer quand l'onglet redevient actif (iPhone en veille, etc.)
    const handleVisible = () => {
      if (document.visibilityState === 'visible') checkAndSet()
    }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisible)

    // Service Worker → écouter les messages de connectivité du SW
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_CONNECTIVITY') {
        const online = event.data.online as boolean
        if (mounted.current) setIsOnline(online)
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSWMessage)

    return () => {
      mounted.current = false
      if (pingRef.current) clearInterval(pingRef.current)
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisible)
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
    }
  }, [checkAndSet, startPolling])

  return isOnline
}
