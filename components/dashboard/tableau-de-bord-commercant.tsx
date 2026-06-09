// src/components/dashboard/tableau-de-bord-commercant.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CarteStatistique } from "./cartes-statistiques"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Store, DollarSign, TrendingUp, Wallet, Plus,
  Users, ShoppingCart, ArrowRight, ChevronRight
} from "lucide-react"
import Link from "next/link"

interface StatistiquesProps {
  statistiques: {
    nombreBoutiques: number
    ventesDuJour: number
    totalVentes: number
    soldeTotal: number
    boutiquesRecentes: Array<{
      id: string
      nom: string
      solde: number
      gerant: string | null
      nombreVentes: number
      nombreEmployes: number
    }>
  }
}

export function TableauDeBordCommercant({ statistiques }: StatistiquesProps) {
  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fadeIn">
      {/* En-tête responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Tableau de Bord
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Bienvenue sur votre espace commerçant
          </p>
        </div>
        <Link href="/commercant/boutiques" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Boutique
          </Button>
        </Link>
      </div>

      {/* Cartes statistiques - Grid responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <CarteStatistique
          titre="Boutiques"
          valeur={statistiques.nombreBoutiques.toString()}
          icone={Store}
          description="Total"
        />
        <CarteStatistique
          titre="Ventes/jour"
          valeur={`${statistiques.ventesDuJour.toLocaleString('fr-FR')} FCFA`}
          icone={DollarSign}
          description="Aujourd'hui"
        />
        <CarteStatistique
          titre="Total Ventes"
          valeur={`${statistiques.totalVentes.toLocaleString('fr-FR')} FCFA`}
          icone={TrendingUp}
          description="Global"
        />
        <CarteStatistique
          titre="Solde"
          valeur={`${statistiques.soldeTotal.toLocaleString('fr-FR')} FCFA`}
          icone={Wallet}
          description="Total"
        />
      </div>

      {/* Boutiques récentes - Responsive */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Boutiques Récentes</CardTitle>
          <Link href="/commercant/boutiques">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              Voir tout
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {statistiques.boutiquesRecentes.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Store className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                Aucune boutique
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Commencez par créer votre première boutique
              </p>
              <Link href="/commercant/boutiques">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une boutique
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {statistiques.boutiquesRecentes.map((boutique) => (
                <Link
                  key={boutique.id}
                  href={`/commercant/boutiques/${boutique.id}`}
                  className="block"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                        <Store className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {boutique.nom}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mt-1">
                          {boutique.gerant && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {boutique.gerant}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            {boutique.nombreVentes} ventes
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {boutique.nombreEmployes} emp.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <Badge variant={boutique.solde >= 0 ? "default" : "destructive"} className="text-xs sm:text-sm">
                        {boutique.solde.toFixed(2)} FCFA
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-gray-400 hidden sm:block" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Lien voir tout mobile */}
          <Link href="/commercant/boutiques" className="sm:hidden block mt-4">
            <Button variant="outline" className="w-full text-sm">
              Voir toutes les boutiques
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Actions rapides - Grid responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Link href="/commercant/boutiques">
          <Card className="hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-green-100 p-2 sm:p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Store className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Gérer les boutiques</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Ajouter ou modifier</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/commercant/employes">
          <Card className="hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-purple-100 p-2 sm:p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Gérer les employés</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Ajouter ou modifier</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/commercant/rapports">
          <Card className="hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98] sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-orange-100 p-2 sm:p-3 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Voir les rapports</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Statistiques détaillées</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}