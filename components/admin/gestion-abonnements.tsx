// src/components/admin/gestion-abonnements.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Plus, CreditCard, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"
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
}

const PRIX = {
    ESSAI_7J: 0,
    UN_MOIS: 1000,
    TROIS_MOIS: 2500,
    SIX_MOIS: 4000,
    UN_AN: 6000,
}

const DUREE_LABELS = {
    ESSAI_7J: "Essai 7 jours",
    UN_MOIS: "1 Mois",
    TROIS_MOIS: "3 Mois",
    SIX_MOIS: "6 Mois",
    UN_AN: "1 An",
}

const DUREE_JOURS = {
    ESSAI_7J: 7,
    UN_MOIS: 30,
    TROIS_MOIS: 90,
    SIX_MOIS: 180,
    UN_AN: 365,
}

export function GestionAbonnements({
    abonnements,
    boutiques
}: {
    abonnements: Abonnement[]
    boutiques: Boutique[]
}) {
    const router = useRouter()
    const [ouvert, setOuvert] = useState(false)
    const [chargement, setChargement] = useState(false)
    const [selectedBoutique, setSelectedBoutique] = useState("")
    const [selectedDuree, setSelectedDuree] = useState("")
    const [filtreStatut, setFiltreStatut] = useState<"tous" | "ACTIF" | "EXPIRE">("tous")

    const abonnementsFiltres = abonnements.filter(a =>
        filtreStatut === "tous" || a.statut === filtreStatut
    )

    const handleCreate = async () => {
        if (!selectedBoutique || !selectedDuree) {
            toast.error("Veuillez sélectionner une boutique et une durée")
            return
        }

        setChargement(true)
        try {
            const reponse = await fetch("/api/abonnements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    boutiqueId: selectedBoutique,
                    duree: selectedDuree,
                }),
            })

            if (reponse.ok) {
                toast.success("Abonnement créé avec succès")
                setOuvert(false)
                setSelectedBoutique("")
                setSelectedDuree("")
                router.refresh()
            } else {
                const err = await reponse.json()
                toast.error(err.erreur || "Erreur")
            }
        } catch {
            toast.error("Erreur de connexion")
        } finally {
            setChargement(false)
        }
    }

    const getStatutBadge = (statut: string, dateFin: Date) => {
        if (statut === "EXPIRE") return <Badge variant="destructive">Expiré</Badge>
        if (statut === "ANNULE") return <Badge variant="secondary">Annulé</Badge>

        const joursRestants = differenceInDays(new Date(dateFin), new Date())
        if (joursRestants <= 7) return <Badge variant="destructive">{joursRestants}j restants</Badge>
        if (joursRestants <= 30) return <Badge variant="secondary">{joursRestants}j restants</Badge>
        return <Badge variant="default">Actif</Badge>
    }

    return (
        <div className="space-y-4">
            {/* Création */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <div className="flex gap-2">
                    {(["tous", "ACTIF", "EXPIRE"] as const).map((f) => (
                        <Button
                            key={f}
                            variant={filtreStatut === f ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFiltreStatut(f)}
                        >
                            {f === "tous" ? "Tous" : f === "ACTIF" ? "Actifs" : "Expirés"}
                        </Button>
                    ))}
                </div>
                <Dialog open={ouvert} onOpenChange={setOuvert}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nouvel Abonnement
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer un abonnement</DialogTitle>
                            <DialogDescription>
                                Attribuez un abonnement à une boutique
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div>
                                <Label>Boutique *</Label>
                                <Select value={selectedBoutique} onValueChange={setSelectedBoutique}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une boutique" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {boutiques.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>{b.nom}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Durée *</Label>
                                <Select value={selectedDuree} onValueChange={setSelectedDuree}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une durée" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(DUREE_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label} - {PRIX[key as keyof typeof PRIX].toFixed(2)}€
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedDuree && (
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                    <p className="text-sm text-blue-800">
                                        Montant: <strong>{PRIX[selectedDuree as keyof typeof PRIX].toFixed(2)}€</strong>
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setOuvert(false)}>Annuler</Button>
                                <Button onClick={handleCreate} disabled={chargement}>
                                    {chargement ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Créer
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Liste */}
            {abonnementsFiltres.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Aucun abonnement</h3>
                        <p className="text-gray-500">Créez le premier abonnement</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full bg-white rounded-lg border">
                            <thead>
                                <tr className="border-b bg-gray-50 text-left text-sm text-gray-500">
                                    <th className="p-4">Boutique</th>
                                    <th className="p-4">Commerçant</th>
                                    <th className="p-4">Durée</th>
                                    <th className="p-4">Début</th>
                                    <th className="p-4">Fin</th>
                                    <th className="p-4">Montant</th>
                                    <th className="p-4">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {abonnementsFiltres.map((abo) => (
                                    <tr key={abo.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium">{abo.boutique.nom}</td>
                                        <td className="p-4 text-sm">
                                            <p>{abo.commercant.nom}</p>
                                            <p className="text-gray-500 text-xs">{abo.commercant.email}</p>
                                        </td>
                                        <td className="p-4 text-sm">{DUREE_LABELS[abo.duree as keyof typeof DUREE_LABELS]}</td>
                                        <td className="p-4 text-sm">{format(new Date(abo.dateDebut), "dd/MM/yyyy", { locale: fr })}</td>
                                        <td className="p-4 text-sm">{format(new Date(abo.dateFin), "dd/MM/yyyy", { locale: fr })}</td>
                                        <td className="p-4 text-sm font-medium">{abo.montant.toFixed(2)} €</td>
                                        <td className="p-4">{getStatutBadge(abo.statut, abo.dateFin)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-3">
                        {abonnementsFiltres.map((abo) => (
                            <Card key={abo.id}>
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{abo.boutique.nom}</p>
                                            <p className="text-sm text-gray-500">{abo.commercant.nom}</p>
                                        </div>
                                        {getStatutBadge(abo.statut, abo.dateFin)}
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>{DUREE_LABELS[abo.duree as keyof typeof DUREE_LABELS]}</span>
                                        <span className="font-medium">{abo.montant.toFixed(2)} €</span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Du {format(new Date(abo.dateDebut), "dd/MM/yyyy", { locale: fr })} au {format(new Date(abo.dateFin), "dd/MM/yyyy", { locale: fr })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}