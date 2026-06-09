// src/components/dashboard/cartes-statistiques.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface CarteStatistiqueProps {
  titre: string
  valeur: string
  icone: LucideIcon
  description?: string
}

export function CarteStatistique({
  titre,
  valeur,
  icone: Icone,
  description
}: CarteStatistiqueProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 lg:p-6 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
          {titre}
        </CardTitle>
        <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg">
          <Icone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
        <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
          {valeur}
        </div>
        {description && (
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}