// src/hooks/use-boutiques.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

interface Boutique {
  id: string
  nom: string
  solde: number
  _count: {
    ventes: number
    transactions: number
    employes: number
  }
  gerant?: {
    id: string
    nom: string
    prenom: string
    email: string
  }
}

export function useBoutiques() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerBoutiques = useCallback(async () => {
    try {
      setChargement(true)
      const reponse = await fetch("/api/boutiques")
      
      if (!reponse.ok) {
        throw new Error("Erreur lors du chargement")
      }
      
      const donnees = await reponse.json()
      setBoutiques(donnees)
    } catch (erreur) {
      toast.error("Impossible de charger les boutiques")
      console.error(erreur)
    } finally {
      setChargement(false)
    }
  }, [])

  const creerBoutique = async (donnees: Partial<Boutique>) => {
    try {
      const reponse = await fetch("/api/boutiques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees)
      })

      if (!reponse.ok) {
        throw new Error("Erreur lors de la création")
      }

      const nouvelleBoutique = await reponse.json()
      setBoutiques(prev => [nouvelleBoutique, ...prev])
      toast.success("Boutique créée avec succès")
      return nouvelleBoutique
    } catch (erreur) {
      toast.error("Impossible de créer la boutique")
      console.error(erreur)
      return null
    }
  }

  const supprimerBoutique = async (id: string) => {
    try {
      const reponse = await fetch(`/api/boutiques/${id}`, {
        method: "DELETE"
      })

      if (!reponse.ok) {
        throw new Error("Erreur lors de la suppression")
      }

      setBoutiques(prev => prev.filter(b => b.id !== id))
      toast.success("Boutique supprimée avec succès")
    } catch (erreur) {
      toast.error("Impossible de supprimer la boutique")
      console.error(erreur)
    }
  }

  useEffect(() => {
    chargerBoutiques()
  }, [chargerBoutiques])

  return {
    boutiques,
    chargement,
    creerBoutique,
    supprimerBoutique,
    actualiser: chargerBoutiques
  }
}