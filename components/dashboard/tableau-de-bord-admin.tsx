// src/components/dashboard/tableau-de-bord-admin.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CarteStatistique } from "./cartes-statistiques"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Store, Users, CreditCard, TrendingUp, DollarSign,
  AlertTriangle, Clock
} from "lucide-react"
import Link from "next/link"
import { format, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"

// Les props directement
interface TableauDeBordAdminProps {
  nombreBoutiques: number
  nombreCommercants: number
  nombreAbonnementsActifs: number
  ventesDuMois: number
  revenuTotal: number
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
        <CarteStatistique titre="Abonnements" valeur={nombreAbonnementsActifs.toString()} icone={CreditCard} />
        <CarteStatistique titre="Ventes/mois" valeur={`${ventesDuMois.toFixed(0)} €`} icone={TrendingUp} />
        <CarteStatistique titre="Revenus" valeur={`${revenuTotal.toFixed(0)} €`} icone={DollarSign} />
      </div>

      {/* Abonnements qui expirent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg sm:text-xl">Abonnements à surveiller</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {abonnementsExpirant.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun abonnement n'expire prochainement
            </div>
          ) : (
            <div className="space-y-3">
              {abonnementsExpirant.map((abo) => (
                <div key={abo.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{abo.boutique}</p>
                    <p className="text-xs text-gray-500">{abo.commercant} • {abo.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
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