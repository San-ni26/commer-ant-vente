// src/app/(dashboard)/employe/ventes/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FormulaireVenteEmploye } from "@/components/employes/formulaire-vente-employe"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar, ShoppingCart, DollarSign, Store } from "lucide-react"

export default async function PageVentesEmploye() {
  const session = await auth()

  if (!session?.user) {
    redirect("/connexion")
  }

  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const demain = new Date(aujourdhui)
  demain.setDate(demain.getDate() + 1)
  const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1)

  // Toutes les requêtes en parallèle
  const [employe, ventesDuJour, mesVentesMois] = await Promise.all([
    prisma.employe.findUnique({
      where: { id: session.user.id },
      include: {
        boutique: {
          select: { id: true, nom: true, solde: true }
        }
      }
    }),
    prisma.vente.findMany({
      where: {
        boutique: { employes: { some: { id: session.user.id } } },
        dateVente: { gte: aujourdhui, lt: demain }
      },
      orderBy: { dateVente: 'desc' },
      include: {
        enregistrePar: { select: { nom: true, prenom: true } }
      },
      take: 100
    }),
    prisma.vente.aggregate({
      where: {
        boutique: { employes: { some: { id: session.user.id } } },
        enregistreParId: session.user.id,
        dateVente: { gte: debutMois }
      },
      _sum: { montant: true }
    })
  ])

  const boutique = employe?.boutique
  const totalJour = ventesDuJour.reduce((sum, v) => sum + v.montant, 0)

  if (!boutique) {
    return (
      <div className="text-center py-12">
        <Store className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Aucune boutique assignée</h1>
        <p className="text-gray-500">Contactez votre responsable pour qu'il vous affecte à une boutique.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Enregistrer une vente
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Store className="h-4 w-4" />
            {boutique.nom}
            <Badge variant="outline" className="text-xs">
              Solde: {boutique.solde.toFixed(2)} FCFA
            </Badge>
          </p>
        </div>

        {/* Résumé rapide */}
        <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-500">Aujourd'hui</p>
              <p className="text-sm font-bold text-green-600">{totalJour.toFixed(0)} FCFA</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <ShoppingCart className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-500">Nb ventes</p>
              <p className="text-sm font-bold">{ventesDuJour.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-500">Mon mois</p>
              <p className="text-sm font-bold text-purple-600">
                {(mesVentesMois._sum.montant || 0).toFixed(0)} FCFA
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Formulaire de vente */}
      <FormulaireVenteEmploye boutiqueId={boutique.id} />

      {/* Ventes du jour */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <CardTitle>Ventes enregistrées aujourd'hui</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {ventesDuJour.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>Aucune vente enregistrée aujourd'hui</p>
              <p className="text-sm">Utilisez le formulaire ci-dessus pour ajouter une vente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ventesDuJour.map((vente) => (
                <div key={vente.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{vente.description || 'Vente'}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(vente.dateVente), "HH:mm", { locale: fr })} •
                      par {vente.enregistrePar.prenom || ""} {vente.enregistrePar.nom}
                    </p>
                  </div>
                  <Badge variant="default">{vente.montant.toFixed(2)} FCFA</Badge>
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-between items-center pt-3 mt-3 border-t font-bold">
                <span>Total aujourd'hui</span>
                <span className="text-green-600">{totalJour.toFixed(2)} FCFA</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}