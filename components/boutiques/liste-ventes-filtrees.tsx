// src/components/boutiques/liste-ventes-filtrees.tsx
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Calendar, User, Trash2, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type Vente = {
    id: string
    montant: number
    description: string | null
    dateVente: Date | string
    enregistrePar: {
        nom: string
        prenom?: string | null
    }
}

export function ListeVentesFiltrees({ ventes }: { ventes: Vente[] }) {
    const router = useRouter()
    const [recherche, setRecherche] = useState("")
    const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null)

    const ventesFiltrees = ventes.filter(v =>
        v.description?.toLowerCase().includes(recherche.toLowerCase()) ||
        v.montant.toString().includes(recherche) ||
        v.enregistrePar.nom.toLowerCase().includes(recherche.toLowerCase())
    )

    const total = ventesFiltrees.reduce((sum, v) => sum + v.montant, 0)

    const getDate = (d: Date | string) => typeof d === 'string' ? new Date(d) : d

    const supprimerVente = async (id: string) => {
        if (!confirm("Supprimer cette vente ?")) return
        setSuppressionEnCours(id)
        try {
            const r = await fetch(`/api/ventes/${id}`, { method: "DELETE" })
            if (r.ok) {
                toast.success("Vente supprimée")
                router.refresh()
            } else {
                toast.error("Erreur")
            }
        } catch {
            toast.error("Erreur")
        } finally {
            setSuppressionEnCours(null)
        }
    }

    if (ventes.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune vente trouvée pour cette période</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Recherche */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Rechercher..."
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b text-left text-sm text-gray-500">
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Description</th>
                            <th className="pb-3">Par</th>
                            <th className="pb-3 text-right">Montant</th>
                            <th className="pb-3 text-right w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {ventesFiltrees.map((v) => (
                            <tr key={v.id} className="hover:bg-gray-50">
                                <td className="py-3 text-sm whitespace-nowrap">
                                    <p>{format(getDate(v.dateVente), "dd/MM/yyyy", { locale: fr })}</p>
                                    <p className="text-xs text-gray-400">{format(getDate(v.dateVente), "HH:mm", { locale: fr })}</p>
                                </td>
                                <td className="py-3 text-sm max-w-[200px] truncate">{v.description || "-"}</td>
                                <td className="py-3 text-sm">{v.enregistrePar.prenom || ""} {v.enregistrePar.nom}</td>
                                <td className="py-3 text-sm text-right font-bold">
                                    {v.montant.toLocaleString('fr-FR')} FCFA
                                </td>
                                <td className="py-3 text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => supprimerVente(v.id)}
                                        disabled={suppressionEnCours === v.id}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile */}
            <div className="sm:hidden space-y-3">
                {ventesFiltrees.map((v) => (
                    <div key={v.id} className="bg-gray-50 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between">
                            <span className="text-xs text-gray-500">
                                {format(getDate(v.dateVente), "dd/MM/yyyy HH:mm", { locale: fr })}
                            </span>
                            <span className="font-bold">{v.montant.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        {v.description && <p className="text-sm">{v.description}</p>}
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">
                                {v.enregistrePar.prenom || ""} {v.enregistrePar.nom}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 h-7 text-xs"
                                onClick={() => supprimerVente(v.id)}
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Suppr.
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t font-bold">
                <span>Total</span>
                <span className="text-green-600 text-lg">
                    {total.toLocaleString('fr-FR')} FCFA
                </span>
            </div>
        </div>
    )
}