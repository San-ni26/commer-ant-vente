"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Loader2 } from "lucide-react"
import { PreloadModal } from "@/components/offline/preload-modal"
import { preloadEstRecent } from "@/lib/offline/preload-service"

interface DashboardAuthGuardProps {
  children: React.ReactNode
}

export function DashboardAuthGuard({ children }: DashboardAuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showPreload, setShowPreload] = useState(false)
  const preloadChecked = useRef(false)
  // Délai avant de rediriger — évite la redirection pendant l'hydratation
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      // Attendre 500ms avant de rediriger — évite les faux positifs
      // pendant l'initialisation de la session côté client
      redirectTimer.current = setTimeout(() => {
        router.replace("/connexion")
      }, 500)
    } else {
      // Session trouvée — annuler toute redirection en attente
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current)
        redirectTimer.current = null
      }
    }

    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    }
  }, [status, router])

  // Déclencher le préchargement UNE SEULE FOIS quand la session est authentifiée
  useEffect(() => {
    if (status === "authenticated" && session?.user && !preloadChecked.current) {
      preloadChecked.current = true

      // Petit délai pour laisser le localStorage se stabiliser après window.location.href
      setTimeout(() => {
        const dejaPrecharge = preloadEstRecent()
        if (!dejaPrecharge) {
          setShowPreload(true)
        }
      }, 1000)
    }
  }, [status, session])

  const handlePreloadComplete = () => {
    setShowPreload(false)
  }

  // Pendant le chargement initial — afficher un spinner
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  // Pas de session → null (la redirection est en cours via useEffect)
  if (status === "unauthenticated" || !session?.user) {
    return null
  }

  const userRole = (session.user as any)?.role || "EMPLOYE"
  const boutiqueId = (session.user as any)?.boutiqueId || null

  return (
    <>
      {children}
      <PreloadModal
        open={showPreload}
        userRole={userRole}
        boutiqueId={boutiqueId}
        onComplete={handlePreloadComplete}
        onSkip={handlePreloadComplete}
      />
    </>
  )
}
