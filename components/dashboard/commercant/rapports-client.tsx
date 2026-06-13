// src/components/dashboard/commercant/rapports-client.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Store,
  Users,
  Calendar,
  Loader2,
  FileText
} from "lucide-react"

interface RapportsClientProps {
  boutiques: Array<{ id: string; nom: string }>
  filtres: {
    boutiqueId: string
    periode: string
  }
  stats: {
    totalVentes: number
    nombreVentes: number
    panierMoyen: number
    totalDepenses: number
    totalVersements: number
    ventesParJour: Array<{ date: string; montant: number }>
    ventesParBoutique: Array<{ id: string; nom: string; montant: number; pourcentage: number }>
    ventesParEmploye: Array<{ nom: string; prenom: string | null; montant: number; pourcentage: number }>
    ventesRecentes: Array<{
      id: string
      montant: number
      description: string | null
      dateVente: string
      boutique: { nom: string }
      enregistrePar: { nom: string; prenom: string | null }
    }>
  }
}

export function RapportsCommercantClient({ boutiques, filtres, stats }: RapportsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [boutiqueId, setBoutiqueId] = useState(filtres.boutiqueId)
  const [periode, setPeriode] = useState(filtres.periode)

  const appliquerFiltres = (nouvelleBoutiqueId: string, nouvellePeriode: string) => {
    setBoutiqueId(nouvelleBoutiqueId)
    setPeriode(nouvellePeriode)
    
    startTransition(() => {
      const params = new URLSearchParams()
      params.set("boutiqueId", nouvelleBoutiqueId)
      params.set("periode", nouvellePeriode)
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const formatterMontant = (valeur: number) => {
    return `${Math.round(valeur).toLocaleString("fr-FR")} FCFA`
  }

  // Configuration du graphique SVG
  const donneesGraphique = stats.ventesParJour
  const maxVente = Math.max(...donneesGraphique.map(d => d.montant), 1000)
  
  // Dimensions du SVG
  const width = 600
  const height = 220
  const paddingX = 40
  const paddingY = 25

  // Génération des points du graphique
  const points = donneesGraphique.map((d, index) => {
    const x = paddingX + (index / (donneesGraphique.length - 1 || 1)) * (width - paddingX * 2)
    const y = height - paddingY - (d.montant / maxVente) * (height - paddingY * 2)
    return { x, y, date: d.date, montant: d.montant }
  })

  // Chemin pour le tracé de la ligne
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")

  // Chemin pour la zone remplie en dessous de la ligne
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : ""

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Sélecteurs de filtres */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Rapports Analytiques
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">Suivez et analysez l'évolution de vos commerces</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Sélection Boutique */}
          <div className="w-full sm:w-48">
            <Select 
              value={boutiqueId} 
              onValueChange={(val) => appliquerFiltres(val, periode)}
              disabled={isPending}
            >
              <SelectTrigger className="bg-white border-gray-200">
                <Store className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Boutique" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les boutiques</SelectItem>
                {boutiques.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélection Période */}
          <div className="w-full sm:w-44">
            <Select 
              value={periode} 
              onValueChange={(val) => appliquerFiltres(boutiqueId, val)}
              disabled={isPending}
            >
              <SelectTrigger className="bg-white border-gray-200">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7j">7 derniers jours</SelectItem>
                <SelectItem value="30j">30 derniers jours</SelectItem>
                <SelectItem value="global">Tout le temps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventes Totales */}
        <Card className="shadow-sm border-gray-150">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chiffre d'Affaires</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-black text-gray-900 truncate">
              {formatterMontant(stats.totalVentes)}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Chiffre d'affaires brut sur la période</p>
          </CardContent>
        </Card>

        {/* Nombre de Ventes */}
        <Card className="shadow-sm border-gray-150">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Volume Ventes</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg text-green-600">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-black text-gray-900">
              {stats.nombreVentes}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Transactions de vente validées</p>
          </CardContent>
        </Card>

        {/* Panier Moyen */}
        <Card className="shadow-sm border-gray-150">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Panier Moyen</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-black text-gray-900 truncate">
              {formatterMontant(stats.panierMoyen)}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Moyenne par acte d'achat</p>
          </CardContent>
        </Card>

        {/* Flux de trésorerie net */}
        <Card className="shadow-sm border-gray-150">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dépenses / Sorties</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg text-red-600">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-black text-gray-900 truncate text-red-600">
              {formatterMontant(stats.totalDepenses)}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Dépenses & retraits enregistrés</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique et Performances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique SVG des Ventes */}
        <Card className="lg:col-span-2 shadow-sm border-gray-150">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-bold">Évolution journalière</CardTitle>
            <CardDescription>Visualisation du chiffre d'affaires quotidien</CardDescription>
          </CardHeader>
          <CardContent>
            {donneesGraphique.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                Aucune donnée de vente pour cette période.
              </div>
            ) : (
              <div className="relative w-full overflow-hidden">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                  {/* Grille horizontale de repères */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                    const y = paddingY + ratio * (height - paddingY * 2)
                    const val = maxVente - ratio * maxVente
                    return (
                      <g key={index} className="opacity-40">
                        <line 
                          x1={paddingX} 
                          y1={y} 
                          x2={width - paddingX} 
                          y2={y} 
                          stroke="#e5e7eb" 
                          strokeWidth="1" 
                          strokeDasharray="4,4"
                        />
                        <text 
                          x={paddingX - 8} 
                          y={y + 3} 
                          textAnchor="end" 
                          fontSize="9" 
                          fill="#9ca3af"
                          className="font-medium"
                        >
                          {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}
                        </text>
                      </g>
                    )
                  })}

                  {/* Zone ombrée sous la courbe */}
                  <defs>
                    <linearGradient id="gradient-sales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {areaPath && (
                    <path d={areaPath} fill="url(#gradient-sales)" />
                  )}

                  {/* Ligne principale de la courbe */}
                  {linePath && (
                    <path 
                      d={linePath} 
                      fill="none" 
                      stroke="#2563eb" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Points sur la courbe avec Tooltip simulé sur le hover */}
                  {points.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="4.5" 
                        fill="#ffffff" 
                        stroke="#2563eb" 
                        strokeWidth="2.5" 
                        className="transition-all duration-200 group-hover:r-6 group-hover:fill-blue-600"
                      />
                      {/* Affichage de la valeur au survol du point */}
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <rect 
                          x={p.x - 45} 
                          y={p.y - 28} 
                          width="90" 
                          height="20" 
                          rx="4" 
                          fill="#1e293b" 
                          opacity="0.9"
                        />
                        <text 
                          x={p.x} 
                          y={p.y - 15} 
                          fill="#ffffff" 
                          fontSize="9" 
                          fontWeight="bold" 
                          textAnchor="middle"
                        >
                          {formatterMontant(p.montant)}
                        </text>
                      </g>
                    </g>
                  ))}

                  {/* Libellés de date en bas */}
                  {points.map((p, i) => {
                    // Pour éviter de surcharger les textes, on affiche une date sur deux s'il y a trop de points
                    const showLabel = points.length <= 10 || i % Math.ceil(points.length / 7) === 0 || i === points.length - 1
                    if (!showLabel) return null

                    return (
                      <text 
                        key={i} 
                        x={p.x} 
                        y={height - 6} 
                        textAnchor="middle" 
                        fontSize="9" 
                        fill="#9ca3af"
                        className="font-medium"
                      >
                        {p.date}
                      </text>
                    )
                  })}
                </svg>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classement des Boutiques */}
        <Card className="shadow-sm border-gray-150">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-bold">Performances par Boutique</CardTitle>
            <CardDescription>Contribution au chiffre d'affaires global</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.ventesParBoutique.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Aucune boutique avec des ventes.
              </div>
            ) : (
              stats.ventesParBoutique.map((b) => (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-gray-700 flex items-center gap-1.5 truncate">
                      <Store className="h-3.5 w-3.5 text-gray-400" />
                      {b.nom}
                    </span>
                    <span className="font-bold text-gray-900">{formatterMontant(b.montant)}</span>
                  </div>
                  <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-500" 
                      style={{ width: `${b.pourcentage}%` }}
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-semibold">{b.pourcentage.toFixed(1)}% des ventes</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section Employés et Ventes Récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performances des Employés */}
        <Card className="shadow-sm border-gray-150">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-bold">Ventes par Employé</CardTitle>
            <CardDescription>Volume enregistré par agent de caisse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.ventesParEmploye.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Aucune vente enregistrée.
              </div>
            ) : (
              stats.ventesParEmploye.map((emp, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-gray-700 flex items-center gap-1.5 truncate">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {emp.prenom} {emp.nom}
                    </span>
                    <span className="font-bold text-gray-900">{formatterMontant(emp.montant)}</span>
                  </div>
                  <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-500" 
                      style={{ width: `${emp.pourcentage}%` }}
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-semibold">{emp.pourcentage.toFixed(1)}% des ventes</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Tableau des ventes récentes */}
        <Card className="lg:col-span-2 shadow-sm border-gray-150">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold">Ventes Récentes</CardTitle>
              <CardDescription>Les dernières transactions de vente enregistrées</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.ventesRecentes.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Aucune vente enregistrée sur la période.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date / Heure</TableHead>
                      <TableHead>Boutique</TableHead>
                      <TableHead>Vendeur</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.ventesRecentes.map((vente) => {
                      const dateObj = new Date(vente.dateVente)
                      const dateStr = dateObj.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
                      const heureStr = dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                      
                      return (
                        <TableRow key={vente.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="py-3 text-xs sm:text-sm">
                            <span className="font-semibold">{dateStr}</span>
                            <span className="text-gray-400 text-[10px] block">{heureStr}</span>
                          </TableCell>
                          <TableCell className="py-3 font-medium text-xs sm:text-sm">{vente.boutique.nom}</TableCell>
                          <TableCell className="py-3 text-xs sm:text-sm">
                            {vente.enregistrePar.prenom || ""} {vente.enregistrePar.nom}
                          </TableCell>
                          <TableCell className="py-3 text-gray-500 max-w-[120px] truncate text-xs sm:text-sm">
                            {vente.description || "—"}
                          </TableCell>
                          <TableCell className="py-3 text-right font-black text-blue-600 text-xs sm:text-sm">
                            {formatterMontant(vente.montant)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
