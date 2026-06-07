// src/app/(dashboard)/admin/subscriptions/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"

interface Abonnement {
  id: string
  boutique: {
    nom: string
  }
  duree: string
  dateDebut: string
  dateFin: string
  statut: string
  montant: number
}

interface Boutique {
  id: string
  nom: string
}

export default function SubscriptionsPage() {
  const [shops, setShops] = useState<Boutique[]>([])
  const [subscriptions, setSubscriptions] = useState<Abonnement[]>([])
  const [selectedShop, setSelectedShop] = useState("")
  const [duration, setDuration] = useState("")
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    fetchShops()
    fetchSubscriptions()
  }, [])

  const fetchShops = async () => {
    try {
      const reponse = await fetch('/api/boutiques')
      if (reponse.ok) {
        const donnees = await reponse.json()
        setShops(donnees)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des boutiques:", error)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      setChargement(true)
      const reponse = await fetch('/api/abonnements')
      if (reponse.ok) {
        const donnees = await reponse.json()
        setSubscriptions(donnees)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des abonnements:", error)
      toast.error("Impossible de charger les abonnements")
    } finally {
      setChargement(false)
    }
  }

  const handleCreateSubscription = async () => {
    if (!selectedShop || !duration) {
      toast.error("Veuillez sélectionner une boutique et une durée")
      return
    }

    try {
      const response = await fetch('/api/abonnements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutiqueId: selectedShop,
          duree: duration,
        })
      })

      if (response.ok) {
        toast.success("Abonnement créé avec succès")
        setSelectedShop("")
        setDuration("")
        fetchSubscriptions()
      } else {
        const erreur = await response.json()
        toast.error(erreur.erreur || "Erreur lors de la création")
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la création de l'abonnement")
    }
  }

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "ACTIF":
        return <Badge variant="default">Actif</Badge>
      case "EXPIRE":
        return <Badge variant="destructive">Expiré</Badge>
      case "ANNULE":
        return <Badge variant="secondary">Annulé</Badge>
      default:
        return <Badge>{statut}</Badge>
    }
  }

  const getDureeLabel = (duree: string) => {
    switch (duree) {
      case "UN_MOIS":
        return "1 Mois"
      case "TROIS_MOIS":
        return "3 Mois"
      case "SIX_MOIS":
        return "6 Mois"
      case "UN_AN":
        return "1 An"
      default:
        return duree
    }
  }

  const getPrix = (duree: string) => {
    switch (duree) {
      case "UN_MOIS":
        return "9.99€"
      case "TROIS_MOIS":
        return "24.99€"
      case "SIX_MOIS":
        return "44.99€"
      case "UN_AN":
        return "79.99€"
      default:
        return "0€"
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Gestion des Abonnements</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nouvel Abonnement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Boutique</label>
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une boutique" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Durée</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une durée" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN_MOIS">1 Mois - 9.99€</SelectItem>
                  <SelectItem value="TROIS_MOIS">3 Mois - 24.99€</SelectItem>
                  <SelectItem value="SIX_MOIS">6 Mois - 44.99€</SelectItem>
                  <SelectItem value="UN_AN">1 An - 79.99€</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleCreateSubscription}
                disabled={!selectedShop || !duration}
                className="w-full"
              >
                Créer l'abonnement
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abonnements Actifs</CardTitle>
        </CardHeader>
        <CardContent>
          {chargement ? (
            <div className="text-center py-8">Chargement...</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun abonnement trouvé
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-4 text-left">Boutique</th>
                    <th className="p-4 text-left">Durée</th>
                    <th className="p-4 text-left">Début</th>
                    <th className="p-4 text-left">Fin</th>
                    <th className="p-4 text-left">Montant</th>
                    <th className="p-4 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((abonnement) => (
                    <tr key={abonnement.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{abonnement.boutique?.nom || "N/A"}</td>
                      <td className="p-4">{getDureeLabel(abonnement.duree)}</td>
                      <td className="p-4">
                        {format(new Date(abonnement.dateDebut), "dd/MM/yyyy", { locale: fr })}
                      </td>
                      <td className="p-4">
                        {format(new Date(abonnement.dateFin), "dd/MM/yyyy", { locale: fr })}
                      </td>
                      <td className="p-4">{abonnement.montant.toFixed(2)} €</td>
                      <td className="p-4">{getStatusBadge(abonnement.statut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}