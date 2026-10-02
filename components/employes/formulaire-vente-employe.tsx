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
import { formatMontant } from "@/lib/utils"
import { mutationOffline } from "@/lib/offline/fetch-offline"
import { saveVenteLocale } from "@/lib/offline/db"
import { useOnlineStatus } from "@/hooks/use-online-status"

const MONTANTS_RAPIDES = [500, 1000, 2000, 5000, 10000, 20000, 50000]

export function FormulaireVenteEmploye({
    boutiqueId,
    onVenteCreee,
}: {
    boutiqueId: string
    onVenteCreee?: () => void
}) {
    const router = useRouter()
    const isOnline = useOnlineStatus()
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

        const idTemp = `temp_ev_${Date.now()}_${Math.random().toString(36).slice(2)}`
        const body = { montant, description: donnees.description || undefined }

        const result = await mutationOffline({
            url: `/api/boutiques/${boutiqueId}/ventes`,
            method: 'POST',
            body,
            tag: 'vente:creer',
            localId: idTemp,
            donneeLocale: idTemp,
            onOffline: () => {
                toast.warning(`Vente de ${formatMontant(montant)} enregistrée localement`, {
                    description: 'Elle sera synchronisée dès la reconnexion.',
                    duration: 5000,
                })
            },
            onSuccess: async (data: any) => {
                await saveVenteLocale({ ...data, syncedAt: Date.now() })
            },
        })

        if (result.ok) {
            setSucces(true)
            setDerniereVente(montant)
            setDonnees({ montant: '', description: '' })
            if (result.source === 'network') {
                toast.success(`Vente de ${formatMontant(montant)} enregistrée !`)
            }
            onVenteCreee ? onVenteCreee() : router.refresh()
            setTimeout(() => {
                inputRef.current?.focus()
                setSucces(false)
            }, 1500)
        } else {
            toast.error(result.error || "Erreur lors de l'enregistrement")
        }

        setChargement(false)
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
                                Vente de {derniereVente ? formatMontant(derniereVente) : ""} enregistrée !
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
                  {/*    <div>
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
                                    {formatMontant(montant, { decimales: false })}
                                </Button>
                            ))}
                        </div>
                    </div> */}

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
                         {/* 
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
                        </div> */}
                    </div> 

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">Description</Label>
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