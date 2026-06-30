// components/admin/admin-boutiques-client.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Store,
  Users,
  ShoppingCart,
  Mail,
  MailCheck,
  Trash2,
  Search,
  Loader2,
  Calendar,
  DollarSign,
  AlertTriangle,
} from "lucide-react"

interface Boutique {
  id: string
  nom: string
  solde: number
  commercant: {
    id: string
    nom: string
    email: string
    emailVerifie: boolean
  }
  _count: {
    ventes: number
    employes: number
    transactions: number
  }
  abonnements: Array<{
    dateFin: string
    duree: string
  }>
}

export function AdminBoutiquesClient() {
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [recherche, setRecherche] = useState("")
  const [chargement, setChargement] = useState(true)
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)

  const chargerBoutiques = useCallback(async () => {
    setChargement(true)
    try {
      const response = await fetch("/api/admin/boutiques")
      if (!response.ok) throw new Error("Erreur de chargement")
      const data = await response.json()
      setBoutiques(data)
    } catch (err) {
      toast.error("Impossible de charger les boutiques")
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    chargerBoutiques()
  }, [chargerBoutiques])

  // Activer ou désactiver l'email d'un commerçant
  const toggleEmail = async (userId: string, emailVerifieActuel: boolean, boutiqueNom: string) => {
    const actionId = `email-${userId}`
    setActionEnCours(actionId)
    try {
      const response = await fetch("/api/admin/boutiques", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, emailVerifie: !emailVerifieActuel }),
      })

      if (response.ok) {
        toast.success(
          !emailVerifieActuel
            ? `Compte associé à la boutique "${boutiqueNom}" activé (email vérifié)`
            : `Email désactivé pour la boutique "${boutiqueNom}"`
        )
        // Mettre à jour localement
        setBoutiques((prev) =>
          prev.map((b) => {
            if (b.commercant.id === userId) {
              return {
                ...b,
                commercant: { ...b.commercant, emailVerifie: !emailVerifieActuel },
              };
            }
            return b
          })
        )
      } else {
        const err = await response.json()
        toast.error(err.erreur || "Erreur lors de la modification")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setActionEnCours(null)
    }
  }

  // Supprimer boutique et tout ce qui est associé
  const supprimerBoutique = async (id: string, nom: string) => {
    if (
      !confirm(
        `Êtes-vous absolument sûr de vouloir supprimer définitivement la boutique "${nom}" ainsi que TOUTES ses données associées (ventes, employés, transactions, abonnements) ? Cette action est irréversible.`
      )
    ) {
      return
    }

    const actionId = `delete-${id}`
    setActionEnCours(actionId)

    try {
      const response = await fetch(`/api/admin/boutiques?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success(`La boutique "${nom}" et ses dépendances ont été supprimées`)
        setBoutiques((prev) => prev.filter((b) => b.id !== id))
      } else {
        const err = await response.json()
        toast.error(err.erreur || "Erreur lors de la suppression")
      }
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setActionEnCours(null)
    }
  }

  const boutiquesFiltrees = boutiques.filter(
    (b) =>
      b.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      b.commercant.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      b.commercant.email.toLowerCase().includes(recherche.toLowerCase())
  )

  if (chargement) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Chargement des boutiques...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une boutique, commerçant, email..."
            className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500 font-semibold">
          {boutiquesFiltrees.length} boutique(s) trouvée(s)
        </div>
      </div>

      {/* Grid des boutiques */}
      {boutiquesFiltrees.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center space-y-4">
            <Store className="h-16 w-16 text-gray-300 mx-auto" />
            <h3 className="text-lg font-bold text-gray-700">Aucune boutique</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Aucune boutique ne correspond à votre recherche actuelle.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boutiquesFiltrees.map((b) => {
            const hasActiveSub = b.abonnements && b.abonnements.length > 0
            const emailVerifie = b.commercant.emailVerifie

            return (
              <Card
                key={b.id}
                className="bg-white border-gray-150 hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col justify-between rounded-xl shadow-sm"
              >
                {/* Ligne de couleur supérieure */}
                <div
                  className={`h-1.5 w-full ${
                    hasActiveSub ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                />

                <CardContent className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  {/* Titre et Solde */}
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 line-clamp-1">
                          {b.nom}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          ID: {b.id}
                        </p>
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 font-black text-sm px-2.5 py-1">
                        {b.solde.toLocaleString("fr-FR")} FCFA
                      </Badge>
                    </div>

                    {/* Propriétaire */}
                    <div className="mt-5 p-4 bg-gray-50 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          Commerçant
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-2 py-0.5 font-black uppercase tracking-wider ${
                            emailVerifie
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-amber-50 border-amber-200 text-amber-700"
                          }`}
                        >
                          {emailVerifie ? "Email Actif" : "Email Non Vérifié"}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        {b.commercant.nom}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {b.commercant.email}
                      </p>
                    </div>
                  </div>

                  {/* Statistiques rapides */}
                  <div className="grid grid-cols-3 gap-3 py-2 text-center bg-gray-50/50 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wide">
                        Ventes
                      </span>
                      <span className="text-sm font-black text-gray-800">
                        {b._count.ventes}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wide">
                        Employés
                      </span>
                      <span className="text-sm font-black text-gray-800">
                        {b._count.employes}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wide">
                        Transactions
                      </span>
                      <span className="text-sm font-black text-gray-800">
                        {b._count.transactions}
                      </span>
                    </div>
                  </div>

                  {/* Infos Abonnement */}
                  {hasActiveSub ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                      <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>
                        Abonné jusqu&apos;au{" "}
                        <strong>
                          {new Date(b.abonnements[0].dateFin).toLocaleDateString(
                            "fr-FR"
                          )}
                        </strong>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 border border-gray-150 p-2.5 rounded-lg">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-gray-400" />
                      <span>Aucun abonnement actif</span>
                    </div>
                  )}

                  {/* Boutons d'Action */}
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`flex-1 text-xs gap-1.5 font-bold ${
                        emailVerifie
                          ? "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                      }`}
                      disabled={actionEnCours !== null}
                      onClick={() =>
                        toggleEmail(
                          b.commercant.id,
                          emailVerifie,
                          b.nom
                        )
                      }
                    >
                      {actionEnCours === `email-${b.commercant.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : emailVerifie ? (
                        <>
                          <Mail className="h-3.5 w-3.5" />
                          Désactiver mail
                        </>
                      ) : (
                        <>
                          <MailCheck className="h-3.5 w-3.5" />
                          Activer mail
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-150 font-bold"
                      disabled={actionEnCours !== null}
                      onClick={() => supprimerBoutique(b.id, b.nom)}
                    >
                      {actionEnCours === `delete-${b.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Supprimer
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
