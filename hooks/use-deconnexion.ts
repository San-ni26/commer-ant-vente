"use client"

// hooks/use-deconnexion.ts
// Déconnexion propre : vide toutes les données locales avant signOut
import { signOut } from "next-auth/react"
import { nettoyerDonneesLocales } from "@/lib/offline/db"
import { useState } from "react"

export function useDeconnexion() {
  const [enCours, setEnCours] = useState(false)

  const deconnecter = async () => {
    if (enCours) return
    setEnCours(true)

    try {
      // 1. Vider toutes les données locales du commerçant
      await nettoyerDonneesLocales()
      // 2. Déconnecter la session NextAuth
      await signOut({ callbackUrl: "/connexion" })
    } catch (erreur) {
      console.error("[Déconnexion] Erreur:", erreur)
      // Même en cas d'erreur, on déconnecte quand même
      await signOut({ callbackUrl: "/connexion" })
    } finally {
      setEnCours(false)
    }
  }

  return { deconnecter, enCours }
}
