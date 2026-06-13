// src/components/shared/pwa-register.tsx
"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Enregistrer le service worker après le chargement complet de la page
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker enregistré avec succès:", registration.scope)
          })
          .catch((error) => {
            console.error("Échec de l'enregistrement du Service Worker:", error)
          })
      })
    }
  }, [])

  return null
}
