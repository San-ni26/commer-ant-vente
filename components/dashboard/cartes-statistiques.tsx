// src/components/dashboard/cartes-statistiques.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface CarteStatistiqueProps {
  titre: string
  valeur: string
  icone: LucideIcon
  description?: string
  variation?: {
    valeur: number
    positif: boolean
  }
  className?: string
}

export function CarteStatistique({ 
  titre, 
  valeur, 
  icone: Icone,
  description,
  variation,
  className 
}: CarteStatistiqueProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {titre}
        </CardTitle>
        <Icone className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valeur}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {variation && (
          <p className={cn(
            "text-xs mt-2",
            variation.positif ? "text-green-600" : "text-red-600"
          )}>
            {variation.positif ? "+" : "-"}{Math.abs(variation.valeur)}%
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Version avec chargement
export function CarteStatistiqueChargement() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}