// components/shared/pwa-register.tsx
"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function PWARegister() {
  useEffect(() => {
    // Ne pas enregistrer le SW en développement
    // → évite les boucles de réinstallation causées par HMR
    if (process.env.NODE_ENV !== "production") return
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

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

        // Recharger proprement quand le nouveau SW prend le contrôle
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload()
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
