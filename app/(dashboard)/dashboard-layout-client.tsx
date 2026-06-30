"use client"

import { useEffect } from "react"
import { BarreLaterale } from "@/components/shared/barre-laterale"
import { EnTete } from "@/components/shared/en-tete"
import { BarreNavigationBas } from "@/components/shared/barre-navigation-bas"

interface DashboardLayoutClientProps {
    children: React.ReactNode
    user: {
        name?: string | null
        email?: string | null
        role?: string
    }
}

export function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator) || !navigator.onLine) return

        // Éviter de relancer le prefetch à chaque navigation de page
        if ((window as any).__dashboardPrefetched) return
        (window as any).__dashboardPrefetched = true

        const prefetchPages = async () => {
            const role = user?.role
            if (!role) return

            const links: Record<string, string[]> = {
                ADMIN: ["/admin", "/admin/boutiques", "/admin/abonnements", "/admin/rapports"],
                COMMERCANT: ["/commercant", "/commercant/boutiques", "/commercant/employes", "/commercant/rapports"],
                EMPLOYE: ["/employe", "/employe/ventes"],
            }

            const currentPath = window.location.pathname
            const pathsToPrefetch = (links[role as keyof typeof links] || [])
                .filter(path => path !== currentPath)

            for (const path of pathsToPrefetch) {
                try {
                    // 1. Charger la version HTML
                    fetch(path, { headers: { "Accept": "text/html" } }).catch(() => {})
                    
                    // 2. Charger la version RSC pour la navigation interne fluide Next.js
                    fetch(path, {
                        headers: {
                            "RSC": "1",
                            "Accept": "text/x-component",
                            "Next-Router-Prefetch": "1"
                        }
                    }).catch(() => {})
                } catch {
                    // Ignorer les erreurs
                }
            }
        }

        // Exécuter pendant le temps d'inactivité du navigateur après 4 secondes
        const runPrefetch = () => {
            if ("requestIdleCallback" in window) {
                window.requestIdleCallback(() => prefetchPages(), { timeout: 10000 })
            } else {
                setTimeout(prefetchPages, 1000)
            }
        }

        const timer = setTimeout(runPrefetch, 4000)
        return () => clearTimeout(timer)
    }, [user])

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
            {/* Barre Latérale fixe pour écrans de taille Desktop */}
            <aside className="hidden lg:block fixed top-0 left-0 bottom-0 z-40 w-64 border-r border-gray-200">
                <BarreLaterale user={user} />
            </aside>

            {/* Zone de contenu principal */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                <EnTete
                    onMenuClick={() => {}}
                    user={user}
                />

                {/* Espace de contenu principal - Ajout de padding de bas de page sur mobile pour libérer l'espace de la barre basse */}
                <main className="flex-grow p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
                    {children}
                </main>
            </div>

            {/* Barre de navigation basse pour mobile */}
            <BarreNavigationBas user={user} />
        </div>
    )
}