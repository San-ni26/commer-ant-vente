// src/components/dashboard/tableau-de-bord-admin.tsx
import { CarteStatistique } from "./cartes-statistiques"
import { Store, Users, CreditCard, TrendingUp, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatistiquesAdminProps {
  statistiques: {
    nombreBoutiques: number
    nombreCommercants: number
    nombreAbonnementsActifs: number
    revenuTotal: number
    ventesDuMois: number
  }
}

export function TableauDeBordAdmin({ statistiques }: StatistiquesAdminProps) {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Tableau de Bord Admin</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CarteStatistique
          titre="Boutiques"
          valeur={statistiques.nombreBoutiques.toString()}
          icone={Store}
          description="Nombre total de boutiques"
        />
        <CarteStatistique
          titre="Commerçants"
          valeur={statistiques.nombreCommercants.toString()}
          icone={Users}
          description="Utilisateurs actifs"
        />
        <CarteStatistique
          titre="Abonnements Actifs"
          valeur={statistiques.nombreAbonnementsActifs.toString()}
          icone={CreditCard}
          description="Abonnements en cours"
        />
        <CarteStatistique
          titre="Revenu Total"
          valeur={`${statistiques.revenuTotal.toFixed(2)} €`}
          icone={DollarSign}
          description="Revenus des abonnements"
        />
        <CarteStatistique
          titre="Ventes du Mois"
          valeur={`${statistiques.ventesDuMois.toFixed(2)} €`}
          icone={TrendingUp}
          description="Total des ventes ce mois"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Aucune activité récente</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Abonnements à Expirer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Aucun abonnement n'expire bientôt</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}