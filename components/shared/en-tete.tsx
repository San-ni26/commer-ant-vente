// src/components/shared/en-tete.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { Bell, LogOut, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { SyncStatusBadge } from "./sync-status-badge"

interface EnTeteProps {
  onMenuClick: () => void // Reste pour la compatibilité desktop si besoin, mais inutilisé sur mobile
  user?: {
    name?: string | null
    email?: string | null
    role?: string
  }
}

export function EnTete({ user }: EnTeteProps) {
  const pathname = usePathname()
  const [dropdownOuvert, setDropdownOuvert] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    function clickExterieur(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOuvert(false)
      }
    }
    document.addEventListener("mousedown", clickExterieur)
    return () => document.removeEventListener("mousedown", clickExterieur)
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo et titre de page */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg lg:hidden shadow-md shadow-blue-500/20">
              <Store className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                {titrePage}
              </h2>
              <p className="text-xs text-gray-500 truncate hidden sm:block">
                {user?.role === "ADMIN" && "Administrateur"}
                {user?.role === "COMMERCANT" && "Commerçant"}
                {user?.role === "EMPLOYE" && "Employé"}
              </p>
            </div>
          </div>

          {/* Actions à droite */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Badge de synchronisation offline */}
            <SyncStatusBadge />

            <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            </Button>

            {/* Menu Utilisateur Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOuvert(!dropdownOuvert)}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all duration-200 select-none cursor-pointer focus:outline-none ring-2 ring-transparent active:ring-blue-400"
              >
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </button>

              {/* Contenu Dropdown avec animations */}
              {dropdownOuvert && (
                <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-xl border border-gray-150 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-400 font-medium tracking-wider uppercase">Mon Compte</p>
                    <p className="text-sm font-bold text-gray-800 truncate mt-1">{user?.name || "Utilisateur"}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                      {user?.role}
                    </span>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => signOut({ callbackUrl: "/connexion" })}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}