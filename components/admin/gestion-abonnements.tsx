// src/components/admin/gestion-abonnements.tsx
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Plus, CreditCard, Loader2, Search, X,
  Store, User, Ban, CheckCircle
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Abonnement = {
  id: string
  duree: string
  statut: string
  dateDebut: Date
  dateFin: Date
  montant: number
  boutique: { id: string; nom: string }
  commercant: { id: string; nom: string; email: string }
}

type Boutique = {
  id: string
  nom: string
  commercantId: string
  commercant?: { nom: string; email: string }
}

const PRIX: Record<string, number> = {
  UN_MOIS: 5000,
  TROIS_MOIS: 12000,
  SIX_MOIS: 20000,
  UN_AN: 35000,
}

const DUREE_LABELS: Record<string, string> = {
  UN_MOIS: "1 Mois",
  TROIS_MOIS: "3 Mois",
  SIX_MOIS: "6 Mois",
  UN_AN: "1 An",
}

export function GestionAbonnements({
  abonnements: initialAbonnements,
  boutiques,
}: {
  abonnements: Abonnement[]
  boutiques: Boutique[]
}) {
  const router = useRouter()

  // ─── États dialogue création ───────────────────────────────────────────────
  const [ouvertCreation, setOuvertCreation] = useState(false)
  const [chargementCreation, setChargementCreation] = useState(false)
  const [rechercheBoutique, setRechercheBoutique] = useState("")
  const [boutiqueSelectionnee, setBoutiqueSelectionnee] = useState<Boutique | null>(null)
  const [selectedDuree, setSelectedDuree] = useState("")

  // ─── États dialogue révocation ─────────────────────────────────────────────
  const [abonnementARevoquer, setAbonnementARevoquer] = useState<Abonnement | null>(null)
  const [chargementRevocation, setChargementRevocation] = useState(false)

  // ─── Filtres de liste ──────────────────────────────────────────────────────
  const [abonnements, setAbonnements] = useState(initialAbonnements)
  const [filtreStatut, setFiltreStatut] = useState<"tous" | "ACTIF" | "EXPIRE" | "ANNULE">("tous")
  const [rechercheListе, setRechercheListе] = useState("")

  // ─── Recherche boutiques dans le dialogue ──────────────────────────────────
  const boutiquesFiltrees = useMemo(() => {
    if (!rechercheBoutique.trim()) return boutiques.slice(0, 8)
    const q = rechercheBoutique.toLowerCase()
    return boutiques
      .filter(
        (b) =>
          b.nom.toLowerCase().includes(q) ||
          b.commercant?.nom.toLowerCase().includes(q) ||
          b.commercant?.email.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [boutiques, rechercheBoutique])

  // ─── Filtre de la liste des abonnements ───────────────────────────────────
  const abonnementsFiltres = useMemo(() => {
    return abonnements.filter((a) => {
      const matchStatut = filtreStatut === "tous" || a.statut === filtreStatut
      const q = rechercheListе.toLowerCase()
      const matchRecherche =
        !q ||
        a.boutique.nom.toLowerCase().includes(q) ||
        a.commercant.nom.toLowerCase().includes(q) ||
        a.commercant.email.toLowerCase().includes(q)
      return matchStatut && matchRecherche
    })
  }, [abonnements, filtreStatut, rechercheListе])

  // ─── Création abonnement ───────────────────────────────────────────────────
  const handleCreer = async () => {
    if (!boutiqueSelectionnee || !selectedDuree) {
      toast.error("Sélectionnez une boutique et une durée")
      return
    }
    setChargementCreation(true)
    try {
      const reponse = await fetch("/api/abonnements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boutiqueId: boutiqueSelectionnee.id, duree: selectedDuree }),
      })
      if (reponse.ok) {
        const nouvelAbo = await reponse.json()
        setAbonnements((prev) => [nouvelAbo, ...prev])
        toast.success(`Abonnement ${DUREE_LABELS[selectedDuree]} créé pour ${boutiqueSelectionnee.nom}`)
        setOuvertCreation(false)
        setBoutiqueSelectionnee(null)
        setRechercheBoutique("")
        setSelectedDuree("")
        router.refresh()
      } else {
        const err = await reponse.json()
        toast.error(err.erreur || "Erreur lors de la création")
      }
    } catch {
      toast.error("Erreur de connexion")
    } finally {
      setChargementCreation(false)
    }
  }

  // ─── Révocation abonnement ─────────────────────────────────────────────────
  const handleRevoquer = async () => {
    if (!abonnementARevoquer) return
    setChargementRevocation(true)
    try {
      const reponse = await fetch(`/api/abonnements/${abonnementARevoquer.id}`, {
        method: "PATCH",
      })
      if (reponse.ok) {
        setAbonnements((prev) =>
          prev.map((a) => (a.id === abonnementARevoquer.id ? { ...a, statut: "ANNULE" } : a))
        )
        toast.success(`Abonnement de "${abonnementARevoquer.boutique.nom}" révoqué`)
        setAbonnementARevoquer(null)
        router.refresh()
      } else {
        const err = await reponse.json()
        toast.error(err.erreur || "Erreur lors de la révocation")
      }
    } catch {
      toast.error("Erreur de connexion")
    } finally {
      setChargementRevocation(false)
    }
  }

  // ─── Badge statut ──────────────────────────────────────────────────────────
  const getStatutBadge = (statut: string, dateFin: Date) => {
    if (statut === "ANNULE") return <Badge variant="secondary">Annulé</Badge>
    if (statut === "EXPIRE") return <Badge variant="destructive">Expiré</Badge>
    const joursRestants = differenceInDays(new Date(dateFin), new Date())
    if (joursRestants <= 7)
      return <Badge variant="destructive">{joursRestants}j restants</Badge>
    if (joursRestants <= 30)
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600">{joursRestants}j restants</Badge>
      )
    return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Actif · {joursRestants}j</Badge>
  }

  return (
    <div className="space-y-5">
      {/* ─── Barre d'actions ─── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        {/* Filtres statut */}
        <div className="flex gap-2 flex-wrap">
          {(["tous", "ACTIF", "EXPIRE", "ANNULE"] as const).map((f) => (
            <Button
              key={f}
              variant={filtreStatut === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltreStatut(f)}
            >
              {f === "tous" ? "Tous" : f === "ACTIF" ? "Actifs" : f === "EXPIRE" ? "Expirés" : "Annulés"}
            </Button>
          ))}
        </div>

        {/* Bouton créer */}
        <Dialog open={ouvertCreation} onOpenChange={(o) => { setOuvertCreation(o); if (!o) { setRechercheBoutique(""); setBoutiqueSelectionnee(null); setSelectedDuree("") } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Abonnement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un abonnement</DialogTitle>
              <DialogDescription>
                Recherchez une boutique par son nom ou par le nom du commerçant, puis choisissez la durée.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Recherche boutique */}
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Boutique *</Label>

                {/* Boutique sélectionnée */}
                {boutiqueSelectionnee ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-sm text-blue-900 flex items-center gap-1.5">
                        <Store className="h-4 w-4" />
                        {boutiqueSelectionnee.nom}
                      </p>
                      {boutiqueSelectionnee.commercant && (
                        <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {boutiqueSelectionnee.commercant.nom} · {boutiqueSelectionnee.commercant.email}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => { setBoutiqueSelectionnee(null); setRechercheBoutique("") }}
                      className="p-1 hover:bg-blue-200 rounded-full transition-colors text-blue-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Rechercher par nom de boutique ou commerçant…"
                        value={rechercheBoutique}
                        onChange={(e) => setRechercheBoutique(e.target.value)}
                        className="pl-9"
                        autoFocus
                      />
                    </div>

                    {/* Résultats */}
                    <div className="border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                      {boutiquesFiltrees.length === 0 ? (
                        <div className="py-6 text-center text-gray-400 text-sm">
                          Aucune boutique trouvée
                        </div>
                      ) : (
                        boutiquesFiltrees.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => setBoutiqueSelectionnee(b)}
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <p className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                              <Store className="h-3.5 w-3.5 text-gray-400" />
                              {b.nom}
                            </p>
                            {b.commercant && (
                              <p className="text-xs text-gray-500 mt-0.5 ml-5">
                                {b.commercant.nom} · {b.commercant.email}
                              </p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sélection durée */}
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Durée *</Label>
                <Select value={selectedDuree} onValueChange={setSelectedDuree}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une durée" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DUREE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label} — {PRIX[key].toLocaleString("fr-FR")} FCFA
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Récapitulatif */}
              {boutiqueSelectionnee && selectedDuree && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Boutique</span>
                    <span className="font-semibold">{boutiqueSelectionnee.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Durée</span>
                    <span className="font-semibold">{DUREE_LABELS[selectedDuree]}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                    <span className="text-gray-500 font-medium">Montant</span>
                    <span className="font-black text-blue-700">{PRIX[selectedDuree].toLocaleString("fr-FR")} FCFA</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-1">
                <Button variant="outline" onClick={() => setOuvertCreation(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreer}
                  disabled={chargementCreation || !boutiqueSelectionnee || !selectedDuree}
                >
                  {chargementCreation && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Créer l'abonnement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── Barre de recherche liste ─── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher dans la liste (boutique, commerçant, email)…"
          value={rechercheListе}
          onChange={(e) => setRechercheListе(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ─── Dialogue confirmation révocation ─── */}
      <Dialog open={!!abonnementARevoquer} onOpenChange={(o) => { if (!o) setAbonnementARevoquer(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" />
              Révoquer l'abonnement
            </DialogTitle>
            <DialogDescription>
              Vous allez annuler l'abonnement de la boutique{" "}
              <strong>{abonnementARevoquer?.boutique.nom}</strong>{" "}
              (commerçant : {abonnementARevoquer?.commercant.nom}).
              <br />
              <span className="text-red-600 font-medium">
                Cette action coupera immédiatement l'accès du commerçant à cette boutique.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setAbonnementARevoquer(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoquer}
              disabled={chargementRevocation}
            >
              {chargementRevocation && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer la révocation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Liste abonnements ─── */}
      {abonnementsFiltres.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun abonnement</h3>
            <p className="text-gray-500 text-sm">Aucun résultat pour vos filtres actuels.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full bg-white text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Boutique</th>
                  <th className="px-4 py-3">Commerçant</th>
                  <th className="px-4 py-3">Durée</th>
                  <th className="px-4 py-3">Début</th>
                  <th className="px-4 py-3">Fin</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {abonnementsFiltres.map((abo) => (
                  <tr key={abo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <span className="flex items-center gap-1.5">
                        <Store className="h-4 w-4 text-gray-400" />
                        {abo.boutique.nom}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{abo.commercant.nom}</p>
                      <p className="text-xs text-gray-400">{abo.commercant.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {DUREE_LABELS[abo.duree] ?? abo.duree}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(abo.dateDebut), "dd/MM/yyyy", { locale: fr })}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {format(new Date(abo.dateFin), "dd/MM/yyyy", { locale: fr })}
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-700">
                      {abo.montant.toLocaleString("fr-FR")} FCFA
                    </td>
                    <td className="px-4 py-3">
                      {getStatutBadge(abo.statut, abo.dateFin)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {abo.statut === "ACTIF" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                          onClick={() => setAbonnementARevoquer(abo)}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Révoquer
                        </Button>
                      )}
                      {abo.statut === "ANNULE" && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                          <Ban className="h-3 w-3" /> Révoqué
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {abonnementsFiltres.map((abo) => (
              <Card key={abo.id} className="shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900 flex items-center gap-1.5">
                        <Store className="h-4 w-4 text-gray-400" />
                        {abo.boutique.nom}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 ml-5">
                        {abo.commercant.nom} · {abo.commercant.email}
                      </p>
                    </div>
                    {getStatutBadge(abo.statut, abo.dateFin)}
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 border-t border-gray-100 pt-2">
                    <span>{DUREE_LABELS[abo.duree] ?? abo.duree}</span>
                    <span className="font-bold text-blue-700">
                      {abo.montant.toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 flex justify-between">
                    <span>Du {format(new Date(abo.dateDebut), "dd/MM/yyyy", { locale: fr })}</span>
                    <span>Au {format(new Date(abo.dateFin), "dd/MM/yyyy", { locale: fr })}</span>
                  </div>
                  {abo.statut === "ACTIF" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full h-8 text-xs mt-1"
                      onClick={() => setAbonnementARevoquer(abo)}
                    >
                      <Ban className="h-3.5 w-3.5 mr-1.5" />
                      Révoquer cet abonnement
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}