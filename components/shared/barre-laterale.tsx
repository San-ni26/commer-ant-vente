// src/components/shared/barre-laterale.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingCart,
  BarChart3,
  CreditCard,
  X,
  LogOut,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

interface BarreLateraleProps {
  onClose?: () => void
  user?: {
    name?: string | null
    email?: string | null
    role?: string
  }
}

export function BarreLaterale({ onClose, user }: BarreLateraleProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navigation = {
    ADMIN: [
      { nom: "Tableau de bord", href: "/admin", icone: LayoutDashboard },
      { nom: "Boutiques", href: "/admin/boutiques", icone: Store },
      { nom: "Abonnements", href: "/admin/abonnements", icone: CreditCard },
      { nom: "Rapports", href: "/admin/rapports", icone: BarChart3 },
    ],
    COMMERCANT: [
      { nom: "Tableau de bord", href: "/commercant", icone: LayoutDashboard },
      { nom: "Mes Boutiques", href: "/commercant/boutiques", icone: Store },
      { nom: "Employés", href: "/commercant/employes", icone: Users },
      { nom: "Rapports", href: "/commercant/rapports", icone: BarChart3 },
    ],
    EMPLOYE: [
      { nom: "Tableau de bord", href: "/employe", icone: LayoutDashboard },
      { nom: "Ventes", href: "/employe/ventes", icone: ShoppingCart },
    ],
  }

  const role = user?.role
  const liens = role ? navigation[role as keyof typeof navigation] || [] : []

  return (
    <div className="h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col">
      {/* En-tête sidebar */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base">Commerce Vente</h1>
            <p className="text-[10px] sm:text-xs text-gray-400">Gestion commerciale</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-white hover:bg-gray-700"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {liens.map((lien) => {
          const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname
          const linkPath = lien.href.endsWith("/") && lien.href !== "/" ? lien.href.slice(0, -1) : lien.href

          const estActif = mounted && (["/admin", "/commercant", "/employe"].includes(linkPath)
            ? path === linkPath
            : path === linkPath || path.startsWith(linkPath + "/"))

          return (
            <Link
              key={lien.href}
              href={lien.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm sm:text-base",
                "touch-manipulation",
                estActif
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
            >
              <lien.icone className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{lien.nom}</span>
              {estActif && <ChevronRight className="h-4 w-4" />}
            </Link>
          )
        })}
      </nav>

      {/* Profil utilisateur */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "Utilisateur"}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full text-gray-400 hover:text-white hover:bg-gray-700 justify-start text-sm"
          onClick={() => signOut({ callbackUrl: "/connexion" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  )
}