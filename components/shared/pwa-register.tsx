// components/shared/pwa-register.tsx
"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    let registration: ServiceWorkerRegistration | null = null

    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none", // sw.js jamais mis en cache HTTP
        })

        // Si un SW en attente existe déjà, l'activer immédiatement
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" })
        }

        // Vérifier les mises à jour toutes les 60 secondes
        const intervalId = setInterval(() => {
          registration?.update().catch(() => {})
        }, 60 * 1000)

        // Détecter un nouveau SW en attente d'activation
        registration.addEventListener("updatefound", () => {
          const newWorker = registration?.installing
          if (!newWorker) return

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Activer immédiatement sans demander à l'utilisateur
              newWorker.postMessage({ type: "SKIP_WAITING" })
            }
          })
        })

        // Recharger quand le controller change (nouveau SW activé)
        const hasController = !!navigator.serviceWorker.controller
        let refreshing = false
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return
          refreshing = true
          if (hasController) {
            window.location.reload()
          }
        })

        // Écouter les messages du SW
        navigator.serviceWorker.addEventListener("message", (event) => {
          const { type } = event.data || {}
          if (type === "SW_ACTIVE") {
            console.log("[SW] Actif:", event.data.version)
          }
        })

        return () => clearInterval(intervalId)
      } catch (error) {
        console.error("[SW] Échec enregistrement:", error)
      }
    }

    if (document.readyState === "complete") {
      registerSW()
    } else {
      window.addEventListener("load", registerSW, { once: true })
    }
  }, [])

  return null
}
