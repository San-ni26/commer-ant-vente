// src/components/dashboard/tableau-de-bord-admin.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CarteStatistique } from "./cartes-statistiques"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Store, Users, CreditCard, TrendingUp, DollarSign,
  AlertTriangle, Clock, Lock, Plus
} from "lucide-react"
import Link from "next/link"
import { format, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"

interface TableauDeBordAdminProps {
  nombreBoutiques: number
  nombreCommercants: number
  nombreAbonnementsActifs: number
  ventesDuMois: number
  revenuTotal: number
  boutiqueSansAbonnement: Array<{
    id: string
    nom: string
    commercant: string
    email: string
  }>
  abonnementsExpirant: Array<{
    id: string
    boutique: string
    commercant: string
    email: string
    dateFin: Date
    duree: string
    montant: number
  }>
}

export function TableauDeBordAdmin({
  nombreBoutiques,
  nombreCommercants,
  nombreAbonnementsActifs,
  ventesDuMois,
  revenuTotal,
  boutiqueSansAbonnement,
  abonnementsExpirant
}: TableauDeBordAdminProps) {

  const getDureeLabel = (duree: string) => {
    switch (duree) {
      case "ESSAI_7J": return "Essai 7j"
      case "UN_MOIS": return "1 mois"
      case "TROIS_MOIS": return "3 mois"
      case "SIX_MOIS": return "6 mois"
      case "UN_AN": return "1 an"
      default: return duree
    }
  }

  const getUrgenceBadge = (dateFin: Date) => {
    const joursRestants = differenceInDays(new Date(dateFin), new Date())
    if (joursRestants <= 7) return <Badge variant="destructive">{joursRestants}j</Badge>
    if (joursRestants <= 15) return <Badge variant="secondary">{joursRestants}j</Badge>
    return <Badge variant="outline">{joursRestants} jours</Badge>
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Administration</h1>
          <p className="text-gray-500 mt-1">Gérez la plateforme et les abonnements</p>
        </div>
        <Link href="/admin/abonnements">
          <Button className="w-full sm:w-auto">
            <CreditCard className="h-4 w-4 mr-2" />
            Gérer les abonnements
          </Button>
        </Link>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <CarteStatistique titre="Boutiques" valeur={nombreBoutiques.toString()} icone={Store} />
        <CarteStatistique titre="Commerçants" valeur={nombreCommercants.toString()} icone={Users} />
        <CarteStatistique titre="Abonnements actifs" valeur={nombreAbonnementsActifs.toString()} icone={CreditCard} />
        <CarteStatistique
          titre="Ventes/mois"
          valeur={`${(ventesDuMois || 0).toLocaleString("fr-FR")} FCFA`}
          icone={TrendingUp}
        />
        <CarteStatistique
          titre="Revenus abo."
          valeur={`${(revenuTotal || 0).toLocaleString("fr-FR")} FCFA`}
          icone={DollarSign}
        />
      </div>

      {/* ─── SECTION CRITIQUE : Boutiques sans abonnement ─── */}
      {boutiqueSansAbonnement.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <Lock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg text-red-800">
                  Boutiques sans abonnement actif
                </CardTitle>
                <p className="text-xs text-red-500 mt-0.5">
                  {boutiqueSansAbonnement.length} boutique{boutiqueSansAbonnement.length > 1 ? "s" : ""} — accès restreint pour le commerçant
                </p>
              </div>
            </div>
            <Link href="/admin/abonnements">
              <Button size="sm" variant="destructive" className="hidden sm:flex">
                <Plus className="h-4 w-4 mr-2" />
                Créer un abonnement
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {boutiqueSansAbonnement.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-lg border border-red-100"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                      <Store className="h-4 w-4 text-gray-400" />
                      {b.nom}
                    </p>
                    <p className="text-xs text-gray-500 ml-6">{b.commercant} · {b.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-6 sm:ml-0">
                    <Badge variant="destructive" className="text-[10px]">Sans abonnement</Badge>
                    <Link href="/admin/abonnements">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50">
                        Activer
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/admin/abonnements" className="sm:hidden block mt-3">
              <Button size="sm" variant="destructive" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Créer un abonnement
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Abonnements qui expirent bientôt */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg sm:text-xl">Abonnements à surveiller</CardTitle>
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">Expirant dans les 30 prochains jours</p>
        </CardHeader>
        <CardContent>
          {abonnementsExpirant.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Aucun abonnement n'expire dans les 30 prochains jours ✓
            </div>
          ) : (
            <div className="space-y-3">
              {abonnementsExpirant.map((abo) => (
                <div key={abo.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-orange-500" />
                      {abo.boutique}
                    </p>
                    <p className="text-xs text-gray-500 ml-5">{abo.commercant} · {abo.email}</p>
                    <p className="text-xs text-gray-400 ml-5">{getDureeLabel(abo.duree)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-5 sm:ml-0">
                    <span className="text-xs text-gray-500">
                      Expire le {format(new Date(abo.dateFin), "dd/MM/yyyy", { locale: fr })}
                    </span>
                    {getUrgenceBadge(abo.dateFin)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}