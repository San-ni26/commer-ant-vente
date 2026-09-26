// hooks/use-online-status.ts
// Détection de connectivité réseau avec ping de validation réel
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Endpoint léger à pinguer — retourne 200 instantanément
const PING_URL = '/api/health'
const PING_INTERVAL = 15_000  // 15 secondes
const PING_TIMEOUT  =  5_000  // 5 secondes max

async function verifierConnectivite(): Promise<boolean> {
  if (typeof window === 'undefined') return true
  // Rapide vérification native d'abord
  if (!navigator.onLine) return false

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT)

    const response = await fetch(`${PING_URL}?t=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timer)
    return response.ok
  } catch {
    return false
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return navigator.onLine
  })

  // Ref pour éviter des setState après démontage
  const mounted = useRef(true)

  const checkAndSet = useCallback(async () => {
    const online = await verifierConnectivite()
    if (mounted.current) setIsOnline(online)
  }, [])

  useEffect(() => {
    mounted.current = true

    // Ping initial
    checkAndSet()

    // Ping périodique pour détecter les réseaux captifs
    const interval = setInterval(checkAndSet, PING_INTERVAL)

    // Événements natifs — déclenchent un ping immédiat
    const handleOnline  = () => checkAndSet()
    const handleOffline = () => { if (mounted.current) setIsOnline(false) }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      mounted.current = false
      clearInterval(interval)
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkAndSet])

  return isOnline
}
