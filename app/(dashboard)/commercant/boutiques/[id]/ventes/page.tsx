// src/app/(dashboard)/commercant/boutiques/[id]/ventes/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { FormulaireVente } from "@/components/formulaires/formulaire-vente"
import { ListeVentesFiltrees } from "@/components/boutiques/liste-ventes-filtrees"
import { FiltresVentes } from "@/components/boutiques/filtres-ventes"
import { ExportPDFVentes } from "@/components/boutiques/export-pdf-ventes"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    date?: string; mois?: string; annee?: string
    debut?: string; fin?: string
  }>
}

export default async function PageVentes({ params, searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect("/connexion")

  const { id } = await params
  const filtres = await searchParams

  const boutique = await prisma.boutique.findFirst({
    where: { id, commercantId: session.user.id }
  })
  if (!boutique) redirect("/commercant/boutiques")

  // Conditions de filtre
  const conditions: any = { boutiqueId: id }
  let filtreActif = "Aujourd'hui"

  if (filtres.date) {
    const d = new Date(filtres.date)
    d.setHours(0, 0, 0, 0)
    conditions.dateVente = { gte: d, lt: new Date(d.getTime() + 86400000) }
    filtreActif = `Jour du ${d.toLocaleDateString("fr-FR")}`
  } else if (filtres.mois) {
    const [a, m] = filtres.mois.split("-").map(Number)
    conditions.dateVente = { gte: new Date(a, m - 1, 1), lt: new Date(a, m, 1) }
    filtreActif = `Mois de ${new Date(a, m - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`
  } else if (filtres.annee) {
    conditions.dateVente = { gte: new Date(+filtres.annee, 0, 1), lt: new Date(+filtres.annee + 1, 0, 1) }
    filtreActif = `Année ${filtres.annee}`
  } else if (filtres.debut && filtres.fin) {
    conditions.dateVente = { gte: new Date(filtres.debut), lt: new Date(new Date(filtres.fin).getTime() + 86400000) }
    filtreActif = `Du ${new Date(filtres.debut).toLocaleDateString("fr-FR")} au ${new Date(filtres.fin).toLocaleDateString("fr-FR")}`
  } else {
    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)
    conditions.dateVente = { gte: aujourdhui, lt: new Date(aujourdhui.getTime() + 86400000) }
  }

  const ventes = await prisma.vente.findMany({
    where: conditions,
    include: { enregistrePar: { select: { nom: true, prenom: true } } },
    orderBy: { dateVente: "desc" },
    take: 500,
  })

  const totalVentes = ventes.reduce((s, v) => s + v.montant, 0)
  const moyenne = ventes.length > 0 ? totalVentes / ventes.length : 0
  const maxVente = ventes.length > 0 ? Math.max(...ventes.map(v => v.montant)) : 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/commercant/boutiques/${id}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{boutique.nom} - Ventes</h1>
            <p className="text-sm text-gray-500">{filtreActif}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <ExportPDFVentes
            ventes={ventes}
            boutiqueNom={boutique.nom}
            totalVentes={totalVentes}
            nombreVentes={ventes.length}
            moyenne={moyenne}
            maxVente={maxVente}
            filtreActif={filtreActif}
          />
          <FormulaireVente boutiqueId={id} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-green-600">{totalVentes.toLocaleString("fr-FR")} FCFA</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Nb ventes</p>
          <p className="text-lg font-bold">{ventes.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Moyenne</p>
          <p className="text-lg font-bold text-blue-600">{moyenne.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Max</p>
          <p className="text-lg font-bold text-purple-600">{maxVente.toLocaleString("fr-FR")} FCFA</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4"><FiltresVentes /></CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Liste des ventes <Badge variant="outline" className="ml-2">{ventes.length}</Badge></CardTitle></CardHeader>
        <CardContent><ListeVentesFiltrees ventes={ventes} /></CardContent>
      </Card>
    </div>
  )
}