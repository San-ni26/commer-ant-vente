// src/components/boutiques/details-boutique.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Store, Users, DollarSign, TrendingUp, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface BoutiqueDetail {
  id: string
  nom: string
  solde: number
  gerant?: {
    id: string
    nom: string
    prenom: string
    email: string
  }
  employes: Array<{
    id: string
    nom: string
    prenom: string
    telephone: string
    code: string
  }>
  _count: {
    ventes: number
    transactions: number
  }
}

export function DetailsBoutique({ boutiqueId }: { boutiqueId: string }) {
  const [boutique, setBoutique] = useState<BoutiqueDetail | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    chargerBoutique()
  }, [boutiqueId])

  const chargerBoutique = async () => {
    try {
      setChargement(true)
      const reponse = await fetch(`/api/boutiques/${boutiqueId}`)
      if (!reponse.ok) throw new Error("Erreur de chargement")
      const donnees = await reponse.json()
      setBoutique(donnees)
    } catch (erreur) {
      console.error("Erreur:", erreur)
    } finally {
      setChargement(false)
    }
  }

  if (chargement) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement...</div>
      </div>
    )
  }

  if (!boutique) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-500">Boutique non trouvée</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/commercant/boutiques">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{boutique.nom}</h1>
            <p className="text-gray-500">Gestion de la boutique</p>
          </div>
        </div>
        <Badge variant={boutique.solde >= 0 ? "default" : "destructive"} className="text-lg px-4 py-2">
          Solde: {boutique.solde.toFixed(2)} FCFA
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Ventes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boutique._count.ventes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transactions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boutique._count.transactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Employés
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boutique.employes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Solde Actuel
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boutique.solde.toFixed(2)} FCFA</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations du Gérant</CardTitle>
          </CardHeader>
          <CardContent>
            {boutique.gerant ? (
              <div className="space-y-2">
                <p><span className="font-medium">Nom:</span> {boutique.gerant.prenom} {boutique.gerant.nom}</p>
                <p><span className="font-medium">Email:</span> {boutique.gerant.email}</p>
              </div>
            ) : (
              <p className="text-gray-500">Aucun gérant assigné</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liste des Employés</CardTitle>
          </CardHeader>
          <CardContent>
            {boutique.employes.length > 0 ? (
              <div className="space-y-3">
                {boutique.employes.map((employe) => (
                  <div key={employe.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{employe.prenom} {employe.nom}</p>
                      <p className="text-sm text-gray-500">{employe.telephone}</p>
                    </div>
                    <Badge variant="outline">{employe.code}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Aucun employé enregistré</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Link href={`/commercant/boutiques/${boutiqueId}/ventes`}>
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Voir les Ventes
          </Button>
        </Link>
        <Link href={`/commercant/boutiques/${boutiqueId}/transactions`}>
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Voir les Transactions
          </Button>
        </Link>
      </div>
    </div>
  )
}