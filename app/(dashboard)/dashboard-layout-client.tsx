// src/app/(dashboard)/dashboard-layout-client.tsx
"use client"

import { useState } from "react"
import { BarreLaterale } from "@/components/shared/barre-laterale"
import { EnTete } from "@/components/shared/en-tete"
import { cn } from "@/lib/utils"

interface DashboardLayoutClientProps {
    children: React.ReactNode
    user: {
        name?: string | null
        email?: string | null
        role?: string
    }
}

export function DashboardLayoutClient({ children, user }: DashboardLayoutClientProps) {
    const [menuOuvert, setMenuOuvert] = useState(false)

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Overlay mobile */}
            {menuOuvert && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMenuOuvert(false)}
                />
            )}

            {/* Sidebar mobile */}
            <div className={cn(
                "fixed top-0 left-0 z-50 h-full w-64 transform transition-transform duration-300 lg:translate-x-0",
                menuOuvert ? "translate-x-0" : "-translate-x-full"
            )}>
                <BarreLaterale onClose={() => setMenuOuvert(false)} user={user} />
            </div>

            {/* Contenu principal */}
            <div className="lg:ml-64">
                <EnTete
                    onMenuClick={() => setMenuOuvert(!menuOuvert)}
                    user={user}
                />

                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}