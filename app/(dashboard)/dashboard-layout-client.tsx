"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { BarreLaterale } from "@/components/shared/barre-laterale"
import { EnTete } from "@/components/shared/en-tete"
import { BarreNavigationBas } from "@/components/shared/barre-navigation-bas"

interface DashboardLayoutClientProps {
    children: React.ReactNode
    // user peut venir du parent ou être lu depuis useSession directement
    user?: {
        name?: string | null
        email?: string | null
        role?: string
    }
}

export function DashboardLayoutClient({ children, user: userProp }: DashboardLayoutClientProps) {
    const { data: session } = useSession()
    const user = userProp ?? (session?.user as any) ?? {}

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator) || !navigator.onLine) return

        // Éviter de relancer le prefetch à chaque navigation de page
        if ((window as any).__dashboardPrefetched) return
        
        const role = user?.role
        if (!role) return
        
        (window as any).__dashboardPrefetched = true

        const prefetchPages = async () => {
            const links: Record<string, string[]> = {
                ADMIN: ["/admin", "/admin/boutiques", "/admin/abonnements"],
                COMMERCANT: ["/commercant", "/commercant/boutiques", "/commercant/employes", "/commercant/rapports"],
                EMPLOYE: ["/employe", "/employe/ventes"],
            }

            const currentPath = window.location.pathname
            const pathsToPrefetch = (links[role as keyof typeof links] || [])
                .filter(path => path !== currentPath)

            // Prefetch séquentiel espacé — évite le burst qui surcharge le serveur
            for (const path of pathsToPrefetch) {
                try {
                    // Version HTML uniquement — RSC géré automatiquement par Next.js
                    await fetch(path, {
                        headers: { "Accept": "text/html" },
                        priority: "low",
                    } as RequestInit).catch(() => {})
                    // 300ms entre chaque prefetch pour ne pas saturer
                    await new Promise(r => setTimeout(r, 300))
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

        const timer = setTimeout(runPrefetch, 6000)
        return () => clearTimeout(timer)
    }, [user?.role]) // Seulement le role, pas l'objet user entier

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