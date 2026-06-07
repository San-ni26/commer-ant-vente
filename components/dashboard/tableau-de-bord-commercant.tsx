// src/components/dashboard/tableau-de-bord-commercant.tsx
import { CarteStatistique } from "./cartes-statistiques"
import { DollarSign, Store, TrendingUp, Wallet } from "lucide-react"

interface StatistiquesProps {
  statistiques: {
    nombreBoutiques: number
    ventesDuJour: number
    totalVentes: number
    soldeTotal: number
  }
}

export function TableauDeBordCommercant({ statistiques }: StatistiquesProps) {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Tableau de Bord</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CarteStatistique
          titre="Boutiques"
          valeur={statistiques.nombreBoutiques.toString()}
          icone={Store}
          description="Nombre total de boutiques"
        />
        <CarteStatistique
          titre="Ventes du Jour"
          valeur={`${statistiques.ventesDuJour.toFixed(2)} €`}
          icone={DollarSign}
          description="Total des ventes aujourd'hui"
        />
        <CarteStatistique
          titre="Total Ventes"
          valeur={`${statistiques.totalVentes.toFixed(2)} €`}
          icone={TrendingUp}
          description="Total des ventes"
        />
        <CarteStatistique
          titre="Solde Total"
          valeur={`${statistiques.soldeTotal.toFixed(2)} €`}
          icone={Wallet}
          description="Solde de toutes les boutiques"
        />
      </div>
    </div>
  )
}