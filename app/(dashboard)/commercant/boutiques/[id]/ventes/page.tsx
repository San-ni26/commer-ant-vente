// src/app/(dashboard)/commercant/boutiques/[id]/ventes/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, DollarSign, Calendar, Search } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { FormulaireVente } from "@/components/formulaires/formulaire-vente"
import { ListeVentes } from "@/components/boutiques/liste-ventes"
import { AlertTriangle } from "lucide-react"
interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string }>
}

export default async function PageVentes({ params, searchParams }: PageProps) {
  const session = await auth()

  if (!session?.user) {
    redirect("/connexion")
  }

  const { id } = await params
  const { date } = await searchParams

  // Vérifier que la boutique appartient au commerçant
  const boutique = await prisma.boutique.findFirst({
    where: {
      id,
      commercantId: session.user.id
    }
  })

  if (!boutique) {
    redirect("/commercant/boutiques")
  }

  // Récupérer les ventes
  const ventes = await prisma.vente.findMany({
    where: {
      boutiqueId: id,
      ...(date && {
        dateVente: {
          gte: new Date(date),
          lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
        }
      })
    },
    include: {
      enregistrePar: {
        select: {
          nom: true,
          prenom: true,
        }
      }
    },
    orderBy: {
      dateVente: 'desc'
    },
    take: 50
  })

  const totalVentes = ventes.reduce((sum, vente) => sum + vente.montant, 0)
  // Vérifier l'abonnement
  const abonnement = await prisma.abonnement.findFirst({
    where: {
      boutiqueId: id,
      statut: "ACTIF",
      dateFin: { gte: new Date() }
    }
  })

  if (!abonnement && (session.user as any).role !== "ADMIN") {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Accès limité</h1>
        <p className="text-gray-500 mb-4">
          Votre abonnement a expiré. Souscrivez pour accéder à cette fonctionnalité.
        </p>
        <Link href="/abonnement">
          <Button>Voir les offres</Button>
        </Link>
      </div>
    )
  }
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/commercant/boutiques/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{boutique.nom} - Ventes</h1>
            <p className="text-sm text-gray-500">Gérez les ventes de la boutique</p>
          </div>
        </div>
        <FormulaireVente boutiqueId={id} />
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Total ventes</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              {totalVentes.toFixed(2)} €
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Nombre</p>
            <p className="text-xl sm:text-2xl font-bold">{ventes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Moyenne</p>
            <p className="text-xl sm:text-2xl font-bold">
              {ventes.length > 0 ? (totalVentes / ventes.length).toFixed(2) : "0.00"} €
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Solde boutique</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">
              {boutique.solde.toFixed(2)} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des ventes */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des ventes</CardTitle>
        </CardHeader>
        <CardContent>
          <ListeVentes ventes={ventes} />
        </CardContent>
      </Card>
    </div>
  )
}