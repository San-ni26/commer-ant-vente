// src/components/boutiques/gestion-boutiques.tsx
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
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Store, ShoppingCart, Users, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Type assoupli pour compatibilité Prisma
type Boutique = {
    id: string
    nom: string
    solde: number
    _count: { ventes: number; employes: number }
    gerant: { nom: string; prenom: string | null } | null
}

interface GestionBoutiquesProps {
    boutiques: Boutique[]
}

export function GestionBoutiques({ boutiques }: GestionBoutiquesProps) {
    const router = useRouter()
    const [ouvertCreer, setOuvertCreer] = useState(false)
    const [ouvertEdit, setOuvertEdit] = useState(false)
    const [chargement, setChargement] = useState(false)
    const [editBoutique, setEditBoutique] = useState<Boutique | null>(null)
    const [donnees, setDonnees] = useState({ nom: "" })

    const creerBoutique = async (e: React.FormEvent) => {
        e.preventDefault()
        setChargement(true)
        try {
            const reponse = await fetch("/api/boutiques", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(donnees),
            })
            if (reponse.ok) {
                toast.success("Boutique créée")
                setOuvertCreer(false)
                setDonnees({ nom: "" })
                router.refresh()
            } else {
                toast.error("Erreur lors de la création")
            }
        } catch {
            toast.error("Erreur de connexion")
        } finally {
            setChargement(false)
        }
    }

    const editerBoutique = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editBoutique) return
        setChargement(true)
        try {
            const reponse = await fetch(`/api/boutiques/${editBoutique.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(donnees),
            })
            if (reponse.ok) {
                toast.success("Boutique modifiée")
                setOuvertEdit(false)
                router.refresh()
            } else {
                toast.error("Erreur lors de la modification")
            }
        } catch {
            toast.error("Erreur de connexion")
        } finally {
            setChargement(false)
        }
    }

    const supprimerBoutique = async (id: string) => {
        if (!confirm("Supprimer cette boutique ? Les données seront perdues.")) return
        try {
            const reponse = await fetch(`/api/boutiques/${id}`, { method: "DELETE" })
            if (reponse.ok) {
                toast.success("Boutique supprimée")
                router.refresh()
            } else {
                toast.error("Erreur lors de la suppression")
            }
        } catch {
            toast.error("Erreur de connexion")
        }
    }

    return (
        <div className="space-y-4">
            {/* Modal Création */}
            <Dialog open={ouvertCreer} onOpenChange={setOuvertCreer}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nouvelle Boutique
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Créer une boutique</DialogTitle>
                        <DialogDescription>
                            Ajoutez une nouvelle boutique à gérer
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={creerBoutique} className="space-y-4 mt-4">
                        <div>
                            <Label htmlFor="nom">Nom de la boutique *</Label>
                            <Input
                                id="nom"
                                required
                                value={donnees.nom}
                                onChange={(e) => setDonnees({ nom: e.target.value })}
                                placeholder="Ma boutique"
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button type="button" variant="outline" onClick={() => setOuvertCreer(false)}>
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

            {/* Modal Édition */}
            <Dialog open={ouvertEdit} onOpenChange={setOuvertEdit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier la boutique</DialogTitle>
                        <DialogDescription>
                            Modifiez le nom de la boutique
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={editerBoutique} className="space-y-4 mt-4">
                        <div>
                            <Label htmlFor="edit-nom">Nom</Label>
                            <Input
                                id="edit-nom"
                                required
                                value={donnees.nom}
                                onChange={(e) => setDonnees({ nom: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button type="button" variant="outline" onClick={() => setOuvertEdit(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={chargement}>
                                {chargement ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Enregistrer
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Liste des boutiques */}
            {boutiques.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Aucune boutique</h3>
                        <p className="text-gray-500">Créez votre première boutique</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {boutiques.map((boutique) => (
                        <Card key={boutique.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{boutique.nom}</CardTitle>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setEditBoutique(boutique)
                                                setDonnees({ nom: boutique.nom })
                                                setOuvertEdit(true)
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500"
                                            onClick={() => supprimerBoutique(boutique.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Badge variant="default" className="mb-3">
                                    {boutique.solde.toFixed(2)} FCFA
                                </Badge>
                                {boutique.gerant && (
                                    <p className="text-sm text-gray-500 mb-2">
                                        Gérant: {boutique.gerant.prenom || ""} {boutique.gerant.nom}
                                    </p>
                                )}
                                <div className="flex gap-4 text-sm text-gray-500 mb-3">
                                    <span className="flex items-center gap-1">
                                        <ShoppingCart className="h-3 w-3" />
                                        {boutique._count.ventes} ventes
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {boutique._count.employes} emp.
                                    </span>
                                </div>
                                <Link href={`/commercant/boutiques/${boutique.id}`}>
                                    <Button variant="outline" size="sm" className="w-full">
                                        Gérer
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}