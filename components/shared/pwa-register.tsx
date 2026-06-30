// components/shared/pwa-register.tsx
"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    // En développement, désactiver le Service Worker pour éviter d'intercepter les chunks Turbopack / HMR
    if (process.env.NODE_ENV === "development") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().then(() => {
            console.log("[SW] Désenregistré en développement pour éviter les conflits HMR")
          })
        }
      })
      return
    }

    let registration: ServiceWorkerRegistration | null = null

    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          // updateViaCache: 'none' → sw.js jamais mis en cache HTTP
          updateViaCache: "none",
        })

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
              toast.info("Mise à jour disponible", {
                description: "Une nouvelle version est prête.",
                duration: Infinity,
                action: {
                  label: "Recharger",
                  onClick: () => {
                    newWorker.postMessage({ type: "SKIP_WAITING" })
                  },
                },
              })
            }
          })
        })

        // Recharger proprement uniquement si un contrôleur existait déjà (évite la boucle de reload)
        const hasController = !!navigator.serviceWorker.controller
        let refreshing = false
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return
          refreshing = true
          if (hasController) {
            window.location.reload()
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
