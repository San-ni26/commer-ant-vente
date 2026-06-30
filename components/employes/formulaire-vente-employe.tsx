// src/components/employes/formulaire-vente-employe.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    ShoppingCart, DollarSign, Loader2, CheckCircle,
    Plus, Minus, Zap
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const MONTANTS_RAPIDES = [500, 1000, 2000, 5000, 10000, 20000, 50000]

export function FormulaireVenteEmploye({
    boutiqueId,
    onVenteCreee,
}: {
    boutiqueId: string
    onVenteCreee?: () => void
}) {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [chargement, setChargement] = useState(false)
    const [succes, setSucces] = useState(false)
    const [derniereVente, setDerniereVente] = useState<number | null>(null)
    const [donnees, setDonnees] = useState({
        montant: "",
        description: "",
    })

    // Focus automatique sur le champ montant
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const montant = parseFloat(donnees.montant)
        if (!montant || montant <= 0) {
            toast.error("Veuillez entrer un montant valide")
            return
        }

        setChargement(true)
        setSucces(false)

        try {
            const reponse = await fetch(`/api/boutiques/${boutiqueId}/ventes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    montant,
                    description: donnees.description || undefined,
                }),
            })

            if (reponse.ok) {
                toast.success(`Vente de ${montant.toLocaleString()} FCFA enregistrée !`)
                setSucces(true)
                setDerniereVente(montant)
                setDonnees({ montant: "", description: "" })
                onVenteCreee ? onVenteCreee() : router.refresh()

                // Refocus sur le champ montant
                setTimeout(() => {
                    inputRef.current?.focus()
                    setSucces(false)
                }, 1500)
            } else {
                const erreur = await reponse.json()
                toast.error(erreur.erreur || "Erreur lors de l'enregistrement")
            }
        } catch (erreur) {
            toast.error("Erreur de connexion")
        } finally {
            setChargement(false)
        }
    }

    const montantRapide = (montant: number) => {
        setDonnees(prev => ({
            ...prev,
            montant: prev.montant === montant.toString() ? "" : montant.toString()
        }))
        inputRef.current?.focus()
    }

    const ajouterMontant = (valeur: number) => {
        const actuel = parseFloat(donnees.montant) || 0
        const nouveau = Math.max(0, actuel + valeur)
        setDonnees(prev => ({ ...prev, montant: nouveau.toString() }))
    }

    return (
        <Card className={`transition-all duration-300 ${succes ? "border-green-500 bg-green-50 scale-[1.02]" : ""}`}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    {succes ? (
                        <>
                            <CheckCircle className="h-5 w-5 text-green-500 animate-bounce" />
                            <span className="text-green-700">
                                Vente de {derniereVente?.toLocaleString()} FCFA enregistrée !
                            </span>
                        </>
                    ) : (
                        <>
                            <ShoppingCart className="h-5 w-5" />
                            Nouvelle vente
                        </>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Montants rapides */}
                    <div>
                        <Label className="text-sm text-gray-500 mb-3 block">
                            <Zap className="h-4 w-4 inline mr-1" />
                            Montants rapides (FCFA)
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {MONTANTS_RAPIDES.map((montant) => (
                                <Button
                                    key={montant}
                                    type="button"
                                    variant={donnees.montant === montant.toString() ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => montantRapide(montant)}
                                    className="text-xs sm:text-sm"
                                >
                                    {montant.toLocaleString()}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Montant personnalisé */}
                    <div>
                        <Label htmlFor="montant">Montant (FCFA) *</Label>
                        <div className="relative mt-1.5">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                ref={inputRef}
                                id="montant"
                                type="number"
                                step="100"
                                min="0"
                                required
                                value={donnees.montant}
                                onChange={(e) => setDonnees({ ...donnees, montant: e.target.value })}
                                placeholder="0"
                                className="pl-10 text-xl sm:text-2xl h-14 font-bold text-center"
                                autoFocus
                            />
                        </div>
                        {/* Boutons + / - */}
                        <div className="flex gap-2 mt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => ajouterMontant(-500)}>
                                <Minus className="h-3 w-3 mr-1" />500
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => ajouterMontant(500)}>
                                <Plus className="h-3 w-3 mr-1" />500
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => ajouterMontant(1000)}>
                                <Plus className="h-3 w-3 mr-1" />1000
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => ajouterMontant(5000)}>
                                <Plus className="h-3 w-3 mr-1" />5000
                            </Button>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">Description (optionnel)</Label>
                        <Textarea
                            id="description"
                            value={donnees.description}
                            onChange={(e) => setDonnees({ ...donnees, description: e.target.value })}
                            placeholder="Ex: Vente de pagne, Chaussures, Tissu..."
                            rows={2}
                            className="mt-1.5 resize-none"
                        />
                    </div>

                    {/* Bouton principal */}
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 text-lg font-bold"
                        disabled={chargement}
                    >
                        {chargement ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                Enregistrer la vente
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}