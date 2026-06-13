// src/app/(dashboard)/dashboard-layout-client.tsx
"use client"

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