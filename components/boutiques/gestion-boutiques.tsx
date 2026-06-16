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
import { Plus, Edit, Trash2, Store, ShoppingCart, Users, Loader2, Lock, CheckCircle, Clock, Crown, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"

// Type assoupli pour compatibilité Prisma
type Boutique = {
    id: string
    nom: string
    solde: number
    _count: { ventes: number; employes: number }
    gerant: { nom: string; prenom: string | null } | null
    abonnement: { dateFin: string; duree: string } | null
    abonnementActif: boolean
}

interface GestionBoutiquesProps {
    boutiques: Boutique[]
}

// ─── Badge abonnement par boutique ───────────────────────────────────────────
function BadgeAbonnement({ boutique }: { boutique: Boutique }) {
    if (!boutique.abonnementActif) {
        return (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold">
                <Lock className="h-3 w-3" />
                Non abonné
            </div>
        )
    }

    if (!boutique.abonnement) return null

    const joursRestants = differenceInDays(new Date(boutique.abonnement.dateFin), new Date())

    if (joursRestants <= 7) {
        return (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold">
                <Clock className="h-3 w-3" />
                Expire dans {joursRestants}j
            </div>
        )
    }

    return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold">
            <CheckCircle className="h-3 w-3" />
            Actif · {joursRestants}j
        </div>
    )
}

// ─── Bannière globale si des boutiques sont bloquées ─────────────────────────
function BanniereBloquees({ nombre }: { nombre: number }) {
    if (nombre === 0) return null

    return (
        <Card className="border-red-300 bg-red-50">
            <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2.5 rounded-xl">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-red-800 text-sm sm:text-base">
                                {nombre} boutique{nombre > 1 ? "s" : ""} sans abonnement actif
                            </h3>
                            <p className="text-red-600 text-xs sm:text-sm mt-0.5">
                                L'accès à ces boutiques est restreint. Contactez le service commercial ou activez un abonnement.
                            </p>
                        </div>
                    </div>
                    <Link href="/abonnement" className="flex-shrink-0 w-full sm:w-auto">
                        <Button className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-sm">
                            <Crown className="h-4 w-4 mr-2" />
                            Activer un abonnement
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
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

    const nombreBoutiquesBloquees = boutiques.filter(b => !b.abonnementActif).length

    return (
        <div className="space-y-4">
            {/* Bannière boutiques bloquées */}
            <BanniereBloquees nombre={nombreBoutiquesBloquees} />

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
                        <Card 
                            key={boutique.id} 
                            className={cn(
                                "hover:shadow-lg transition-shadow relative overflow-hidden",
                                !boutique.abonnementActif && "border-red-200 bg-red-50/10"
                            )}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        {!boutique.abonnementActif && <Lock className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                        <span className={!boutique.abonnementActif ? "text-gray-500" : ""}>{boutique.nom}</span>
                                    </CardTitle>
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
                                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                                    <Badge variant="default">
                                        {boutique.solde.toFixed(2)} FCFA
                                    </Badge>
                                    <BadgeAbonnement boutique={boutique} />
                                </div>
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
                                {boutique.abonnementActif ? (
                                    <Link href={`/commercant/boutiques/${boutique.id}`}>
                                        <Button variant="outline" size="sm" className="w-full">
                                            Gérer
                                        </Button>
                                    </Link>
                                ) : (
                                    <Link href="/abonnement" className="w-full">
                                        <Button variant="destructive" size="sm" className="w-full">
                                            <Crown className="h-4 w-4 mr-2" />
                                            Activer l'abonnement
                                        </Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}