// src/components/shared/barre-laterale.tsx - CORRIGÉ
import Link from "next/link"
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  ShoppingCart, 
  BarChart3, 
  CreditCard,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { cn } from "@/lib/utils"

export async function BarreLaterale() {
  const session = await auth()
  const role = (session?.user as any)?.role as string

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

  const liens = role ? navigation[role as keyof typeof navigation] || [] : []

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Commerce Vente</h1>
        <p className="text-sm text-gray-400">Gestion commerciale</p>
      </div>
      
      <nav className="space-y-2">
        {liens.map((lien) => (
          <Link
            key={lien.href}
            href={lien.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              "hover:bg-gray-800 text-gray-300 hover:text-white"
            )}
          >
            <lien.icone className="h-5 w-5" />
            <span>{lien.nom}</span>
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-4 w-56">
        <div className="border-t border-gray-700 pt-4">
          <div className="text-sm text-gray-400">
            <p>{session?.user?.name}</p>
            <p className="text-xs">{session?.user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}