// src/components/shared/barre-navigation-bas.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingCart,
  BarChart3,
  CreditCard
} from "lucide-react"
import { cn } from "@/lib/utils"

interface BarreNavigationBasProps {
  user?: {
    role?: string
  }
}

export function BarreNavigationBas({ user }: BarreNavigationBasProps) {
  const pathname = usePathname()

  const navigation = {
    ADMIN: [
      { nom: "Dashboard", href: "/admin", icone: LayoutDashboard },
      { nom: "Boutiques", href: "/admin/boutiques", icone: Store },
      { nom: "Abonnements", href: "/admin/abonnements", icone: CreditCard },
      { nom: "Rapports", href: "/admin/rapports", icone: BarChart3 },
    ],
    COMMERCANT: [
      { nom: "Dashboard", href: "/commercant", icone: LayoutDashboard },
      { nom: "Boutiques", href: "/commercant/boutiques", icone: Store },
      { nom: "Employés", href: "/commercant/employes", icone: Users },
      { nom: "Rapports", href: "/commercant/rapports", icone: BarChart3 },
    ],
    EMPLOYE: [
      { nom: "Dashboard", href: "/employe", icone: LayoutDashboard },
      { nom: "Ventes", href: "/employe/ventes", icone: ShoppingCart },
    ],
  }

  const role = user?.role
  const liens = role ? navigation[role as keyof typeof navigation] || [] : []

  if (liens.length === 0) return null

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg px-2 py-1.5 pb-safe-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {liens.map((lien) => {
          const estActif = pathname === lien.href || pathname.startsWith(lien.href + "/")

          return (
            <Link
              key={lien.href}
              href={lien.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-2 text-xs transition-all duration-200 relative",
                "touch-manipulation select-none active:scale-95"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-full mb-0.5 transition-all duration-300 relative",
                  estActif 
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-semibold"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                <lien.icone className="h-5.5 w-5.5 flex-shrink-0" />
                {estActif && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-wide transition-colors duration-200",
                  estActif 
                    ? "text-blue-600 dark:text-blue-400 font-semibold" 
                    : "text-gray-500"
                )}
              >
                {lien.nom}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
