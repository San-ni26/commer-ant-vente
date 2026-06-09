// src/components/shared/en-tete.tsx
"use client"

import { Menu, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"

interface EnTeteProps {
  onMenuClick: () => void
  user?: {
    name?: string | null
    role?: string
  }
}

export function EnTete({ onMenuClick, user }: EnTeteProps) {
  const pathname = usePathname()

  const titresPages: Record<string, string> = {
    "/commercant": "Tableau de Bord",
    "/commercant/boutiques": "Mes Boutiques",
    "/commercant/employes": "Employés",
    "/commercant/rapports": "Rapports",
    "/admin": "Administration",
    "/admin/boutiques": "Boutiques",
    "/admin/abonnements": "Abonnements",
    "/admin/rapports": "Rapports",
    "/employe": "Tableau de Bord",
    "/employe/ventes": "Ventes",
  }

  const titrePage = titresPages[pathname] || "Commerce Vente"

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden flex-shrink-0"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
              {titrePage}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">
              {user?.role === "ADMIN" && "Administrateur"}
              {user?.role === "COMMERCANT" && "Commerçant"}
              {user?.role === "EMPLOYE" && "Employé"}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold">
              {user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}