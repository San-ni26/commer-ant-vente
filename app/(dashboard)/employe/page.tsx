// src/app/(dashboard)/employe/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ShoppingCart, DollarSign, Calendar, Store, TrendingUp,
  Clock
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default async function PageDashboardEmploye() {
  const session = await auth()

  if (!session?.user) {
    redirect("/connexion")
  }

  // Récupérer l'employé connecté avec sa boutique
  const employe = await prisma.employe.findUnique({
    where: { id: session.user.id },
    include: {
      boutique: {
        select: {
          id: true,
          nom: true,
          solde: true,
        }
      }
    }
  })

  const boutique = employe?.boutique

  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const demain = new Date(aujourdhui)
  demain.setDate(demain.getDate() + 1)

  // Ventes du jour (si boutique assignée)
  let ventesDuJour: any[] = []
  let totalAujourdhui = 0
  let ventesMoisTotal = 0
  let dernieresVentes: any[] = []

  if (boutique) {
    ventesDuJour = await prisma.vente.findMany({
      where: {
        boutiqueId: boutique.id,
        dateVente: { gte: aujourdhui, lt: demain }
      },
      orderBy: { dateVente: 'desc' },
      include: {
        enregistrePar: { select: { nom: true, prenom: true } }
      }
    })

    totalAujourdhui = ventesDuJour.reduce((sum, v) => sum + v.montant, 0)

    // Ventes du mois
    const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1)
    const ventesMois = await prisma.vente.aggregate({
      where: {
        boutiqueId: boutique.id,
        dateVente: { gte: debutMois }
      },
      _sum: { montant: true }
    })
    ventesMoisTotal = ventesMois._sum.montant || 0

    // Dernières ventes
    dernieresVentes = await prisma.vente.findMany({
      where: { boutiqueId: boutique.id },
      orderBy: { dateVente: 'desc' },
      take: 10
    })
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Bonjour {employe?.prenom || session.user.name?.split(' ')[0] || 'Employé'} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {boutique ? (
              <span className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                {boutique.nom}
                <Badge variant="outline" className="text-xs">
                  Solde: {boutique.solde.toFixed(2)} FCFA
                </Badge>
              </span>
            ) : (
              'Aucune boutique assignée'
            )}
          </p>
        </div>
        {boutique && (
          <Link href="/employe/ventes">
            <Button size="lg" className="w-full sm:w-auto">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Enregistrer une vente
            </Button>
          </Link>
        )}
      </div>

      {/* Si pas de boutique assignée */}
      {!boutique ? (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-6 text-center">
            <Store className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-yellow-800 mb-2">
              En attente d'affectation
            </h2>
            <p className="text-yellow-600">
              Vous n'êtes pas encore assigné à une boutique.
              Contactez votre responsable.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cartes stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Aujourd'hui</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {totalAujourdhui.toFixed(0)} FCFA
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <ShoppingCart className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Nb ventes</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {ventesDuJour.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Ce mois</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {ventesMoisTotal.toFixed(0)} FCFA
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Store className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Boutique</p>
                <p className="text-sm font-bold truncate">
                  {boutique.nom}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ventes du jour */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <CardTitle>Ventes du jour - {boutique.nom}</CardTitle>
              </div>
              <Badge variant="default">{ventesDuJour.length} vente(s)</Badge>
            </CardHeader>
            <CardContent>
              {ventesDuJour.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p>Aucune vente enregistrée aujourd'hui</p>
                  <Link href="/employe/ventes" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Enregistrer une vente
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {ventesDuJour.map((vente) => (
                    <div key={vente.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{vente.description || 'Vente'}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(vente.dateVente), "HH:mm", { locale: fr })}
                          {vente.enregistrePar && (
                            <> • par {vente.enregistrePar.prenom} {vente.enregistrePar.nom}</>
                          )}
                        </p>
                      </div>
                      <Badge variant="default">{vente.montant.toFixed(2)} FCFA</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dernières ventes */}
          <Card>
            <CardHeader>
              <CardTitle>Dernières ventes</CardTitle>
            </CardHeader>
            <CardContent>
              {dernieresVentes.length === 0 ? (
                <p className="text-center py-4 text-gray-500">Aucune vente</p>
              ) : (
                <div className="space-y-2">
                  {dernieresVentes.slice(0, 5).map((vente) => (
                    <div key={vente.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <div>
                          <p>{vente.description || 'Vente'}</p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(vente.dateVente), "dd/MM HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium">{vente.montant.toFixed(2)} FCFA</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}