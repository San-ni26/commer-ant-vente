// src/app/(dashboard)/admin/boutiques/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store, Users, ShoppingCart } from "lucide-react"

export default async function PageAdminBoutiques() {
  const session = await auth()

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/connexion")
  }

  const boutiques = await prisma.boutique.findMany({
    include: {
      commercant: { select: { nom: true, email: true } },
      _count: { select: { ventes: true, employes: true } },
      abonnements: {
        where: { statut: "ACTIF" },
        select: { dateFin: true, duree: true }
      }
    },
    orderBy: { dateCreation: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Boutiques</h1>
        <p className="text-gray-500 mt-1">Toutes les boutiques de la plateforme</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boutiques.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{b.nom}</h3>
                  <p className="text-sm text-gray-500">{b.commercant.nom}</p>
                </div>
                <Badge variant="default">{b.solde.toFixed(2)} €</Badge>
              </div>
              <div className="flex gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" />{b._count.ventes}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{b._count.employes}</span>
              </div>
              {b.abonnements.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Abonné jusqu'au {new Date(b.abonnements[0].dateFin).toLocaleDateString()}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}