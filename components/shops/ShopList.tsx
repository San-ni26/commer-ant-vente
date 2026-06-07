// src/components/shops/ShopList.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Boutique {
  id: string
  nom: string
  solde: number
  gerant?: {
    nom: string
    prenom: string
    email: string
  }
  _count: {
    ventes: number
    transactions: number
    employes: number
  }
}

export function ShopList() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    chargerBoutiques()
  }, [])

  const chargerBoutiques = async () => {
    try {
      setChargement(true)
      const reponse = await fetch("/api/boutiques")
      if (!reponse.ok) throw new Error("Erreur de chargement")
      const donnees = await reponse.json()
      setBoutiques(donnees)
    } catch (erreur) {
      console.error("Erreur:", erreur)
    } finally {
      setChargement(false)
    }
  }

  if (chargement) {
    return <div>Chargement...</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {boutiques.map((boutique) => (
        <Card key={boutique.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>{boutique.nom}</CardTitle>
              <Badge variant={boutique.solde >= 0 ? "default" : "destructive"}>
                {boutique.solde.toFixed(2)} €
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Gérant: </span>
                {boutique.gerant 
                  ? `${boutique.gerant.prenom} ${boutique.gerant.nom}`
                  : "Non assigné"
                }
              </p>
              <div className="flex justify-between">
                <span>Ventes: {boutique._count.ventes}</span>
                <span>Employés: {boutique._count.employes}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}