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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/connexion")
    }
  }, [status, router])

  // Déclencher le préchargement UNE SEULE FOIS quand la session est authentifiée
  useEffect(() => {
    if (status === "authenticated" && session?.user && !preloadChecked.current) {
      preloadChecked.current = true
      
      // Vérifier si le préchargement a déjà été fait récemment (moins de 24h)
      const dejaPrecharge = preloadEstRecent()
      
      if (!dejaPrecharge) {
        // Afficher le modal de préchargement après un court délai
        setTimeout(() => setShowPreload(true), 800)
      }
    }
  }, [status, session])

  const handlePreloadComplete = () => {
    setShowPreload(false)
  }

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
