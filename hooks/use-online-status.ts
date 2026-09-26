// hooks/use-online-status.ts
// Détection de connectivité réseau — événements navigateur + ping périodique
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const PING_URL = '/api/health'
const PING_INTERVAL = 30_000 // 30s
const PING_TIMEOUT  =  5_000

async function verifierConnectivite(): Promise<boolean> {
  if (typeof window === 'undefined') return true
  // Si le navigateur dit offline, c'est fiable — pas besoin de ping
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
  const mounted = useRef(true)

  const mettreAJour = useCallback(async () => {
    const en_ligne = await verifierConnectivite()
    if (mounted.current) setIsOnline(en_ligne)
  }, [])

  useEffect(() => {
    mounted.current = true

    // Événements navigateur — immédiats et fiables
    const handleOnline  = () => mettreAJour() // confirme avec ping
    const handleOffline = () => { if (mounted.current) setIsOnline(false) }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Ping périodique pour détecter réseaux captifs
    const interval = setInterval(mettreAJour, PING_INTERVAL)

    // Vérification initiale
    mettreAJour()

    return () => {
      mounted.current = false
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [mettreAJour])

  return isOnline
}
