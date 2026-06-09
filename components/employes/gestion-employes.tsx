// src/components/employes/gestion-employes.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
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
import { Plus, Trash2, Copy, Check, Loader2, User, Store, Phone } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Employe {
    id: string
    nom: string
    prenom: string | null
    telephone: string
    code: string
    boutique: {
        id: string
        nom: string
    } | null
}

interface Boutique {
    id: string
    nom: string
}

export function GestionEmployes({
    employes,
    boutiques
}: {
    employes: Employe[]
    boutiques: Boutique[]
}) {
    const router = useRouter()
    const [ouvert, setOuvert] = useState(false)
    const [chargement, setChargement] = useState(false)
    const [donnees, setDonnees] = useState({
        nom: "",
        prenom: "",
        telephone: "",
        boutiqueId: "",
    })
    const [codeCopie, setCodeCopie] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setChargement(true)

        try {
            const reponse = await fetch("/api/employes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(donnees),
            })

            if (reponse.ok) {
                toast.success("Employé créé avec succès")
                setOuvert(false)
                setDonnees({ nom: "", prenom: "", telephone: "", boutiqueId: "" })
                router.refresh()
            } else {
                const erreur = await reponse.json()
                toast.error(erreur.erreur || "Erreur")
            }
        } catch (erreur) {
            toast.error("Erreur de connexion")
        } finally {
            setChargement(false)
        }
    }

    const supprimerEmploye = async (id: string) => {
        if (!confirm("Supprimer cet employé ?")) return

        try {
            const reponse = await fetch(`/api/employes?id=${id}`, { method: "DELETE" })
            if (reponse.ok) {
                toast.success("Employé supprimé")
                router.refresh()
            }
        } catch (erreur) {
            toast.error("Erreur lors de la suppression")
        }
    }

    const copierCode = (code: string) => {
        navigator.clipboard.writeText(code)
        setCodeCopie(code)
        toast.success("Code copié !")
        setTimeout(() => setCodeCopie(null), 2000)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={ouvert} onOpenChange={setOuvert}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nouvel Employé
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer un employé</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Nom *</Label>
                                    <Input
                                        required
                                        value={donnees.nom}
                                        onChange={(e) => setDonnees({ ...donnees, nom: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Prénom</Label>
                                    <Input
                                        value={donnees.prenom}
                                        onChange={(e) => setDonnees({ ...donnees, prenom: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Téléphone *</Label>
                                <Input
                                    required
                                    type="tel"
                                    value={donnees.telephone}
                                    onChange={(e) => setDonnees({ ...donnees, telephone: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Boutique</Label>
                                <Select value={donnees.boutiqueId} onValueChange={(v) => setDonnees({ ...donnees, boutiqueId: v })}>
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
                            <div className="flex gap-3 justify-end">
                                <Button type="button" variant="outline" onClick={() => setOuvert(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={chargement}>
                                    {chargement ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Créer
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {employes.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Aucun employé</h3>
                        <p className="text-gray-500">Créez votre premier employé</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {employes.map((employe) => (
                        <Card key={employe.id}>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold">
                                            {employe.prenom} {employe.nom}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <Phone className="h-3 w-3" />
                                            {employe.telephone}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => supprimerEmploye(employe.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                {employe.boutique && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                                        <Store className="h-3 w-3" />
                                        {employe.boutique.nom}
                                    </div>
                                )}

                                <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500">Code d'accès</p>
                                        <p className="font-mono font-bold text-lg">{employe.code}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copierCode(employe.code)}
                                    >
                                        {codeCopie === employe.code ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}