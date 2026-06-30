// src/components/formulaires/formulaire-vente.tsx - Même correction
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { useVentesOffline } from "@/hooks/use-ventes-offline"

export function FormulaireVente({ boutiqueId, onVenteCreee }: { boutiqueId: string; onVenteCreee?: () => void }) {
    const router = useRouter()
    const { creerVente } = useVentesOffline(boutiqueId)
    const [ouvert, setOuvert] = useState(false)
    const [chargement, setChargement] = useState(false)
    const [donnees, setDonnees] = useState({
        montant: "",
        description: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!donnees.montant || parseFloat(donnees.montant) <= 0) {
            toast.error("Veuillez entrer un montant valide")
            return
        }

        setChargement(true)

        try {
            const result = await creerVente({
                montant: parseFloat(donnees.montant),
                description: donnees.description || undefined,
                boutiqueId,
            })

            if (result) {
                setOuvert(false)
                setDonnees({ montant: "", description: "" })
                if (onVenteCreee) onVenteCreee()
                router.refresh()
            }
        } catch (erreur) {
            toast.error("Erreur de connexion")
        } finally {
            setChargement(false)
        }
    }

    return (
        <Dialog open={ouvert} onOpenChange={setOuvert}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle Vente
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enregistrer une vente</DialogTitle>
                    <DialogDescription>
                        Ajoutez une nouvelle vente pour cette boutique
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div>
                        <Label htmlFor="montant">Montant (FCFA) *</Label>
                        <Input
                            id="montant"
                            type="number"
                            step="100"
                            min="0"
                            required
                            value={donnees.montant}
                            onChange={(e) => setDonnees({ ...donnees, montant: e.target.value })}
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            value={donnees.description}
                            onChange={(e) => setDonnees({ ...donnees, description: e.target.value })}
                            placeholder="Détails de la vente..."
                        />
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <Button type="button" variant="outline" onClick={() => setOuvert(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={chargement}>
                            {chargement ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Enregistrement...
                                </>
                            ) : (
                                "Enregistrer"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}