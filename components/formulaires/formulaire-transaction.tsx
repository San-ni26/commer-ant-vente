// src/components/formulaires/formulaire-transaction.tsx
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function FormulaireTransaction({ boutiqueId }: { boutiqueId: string }) {
    const router = useRouter()
    const [ouvert, setOuvert] = useState(false)
    const [chargement, setChargement] = useState(false)
    const [donnees, setDonnees] = useState({
        type: "VERSEMENT",
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
            const reponse = await fetch(`/api/boutiques/${boutiqueId}/transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: donnees.type,
                    montant: parseFloat(donnees.montant),
                    description: donnees.description || undefined,
                }),
            })

            const data = await reponse.json()

            if (reponse.ok) {
                toast.success("Transaction créée avec succès")
                setOuvert(false)
                setDonnees({ type: "VERSEMENT", montant: "", description: "" })
                router.refresh()
            } else {
                toast.error(data.erreur || "Erreur lors de la création")
            }
        } catch (erreur) {
            console.error("Erreur:", erreur)
            toast.error("Erreur de connexion au serveur")
        } finally {
            setChargement(false)
        }
    }

    return (
        <Dialog open={ouvert} onOpenChange={setOuvert}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle Transaction
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nouvelle transaction</DialogTitle>
                    <DialogDescription>
                        Enregistrez un versement, une dépense ou un virement
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div>
                        <Label htmlFor="type">Type de transaction *</Label>
                        <Select value={donnees.type} onValueChange={(v) => setDonnees({ ...donnees, type: v })}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="VERSEMENT">Versement</SelectItem>
                                <SelectItem value="DEPENSE">Dépense</SelectItem>
                                <SelectItem value="VIREMENT_BANCAIRE">Virement bancaire</SelectItem>
                                <SelectItem value="RETRAIT">Retrait</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="montant">Montant (FCFA) *</Label>
                        <Input
                            id="montant"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={donnees.montant}
                            onChange={(e) => setDonnees({ ...donnees, montant: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            value={donnees.description}
                            onChange={(e) => setDonnees({ ...donnees, description: e.target.value })}
                            placeholder="Ex: Paiement fournisseur, Versement caisse..."
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
                                    Création...
                                </>
                            ) : (
                                "Créer la transaction"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}