// src/components/boutiques/liste-ventes.tsx
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Calendar, User, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Type assoupli compatible Prisma
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

interface ListeVentesProps {
    ventes: Vente[]
    boutiqueId?: string
}

export function ListeVentes({ ventes, boutiqueId }: ListeVentesProps) {
    const router = useRouter()
    const [recherche, setRecherche] = useState("")
    const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null)

    const ventesFiltrees = ventes.filter(vente =>
        vente.description?.toLowerCase().includes(recherche.toLowerCase()) ||
        vente.enregistrePar.nom.toLowerCase().includes(recherche.toLowerCase()) ||
        vente.montant.toString().includes(recherche)
    )

    const totalFiltre = ventesFiltrees.reduce((sum, v) => sum + v.montant, 0)

    const getDateValue = (date: Date | string) => {
        return typeof date === 'string' ? new Date(date) : date
    }

    const supprimerVente = async (id: string) => {
        if (!confirm("Supprimer cette vente ?")) return

        setSuppressionEnCours(id)
        try {
            const reponse = await fetch(`/api/ventes/${id}`, { method: "DELETE" })
            if (reponse.ok) {
                toast.success("Vente supprimée")
                router.refresh()
            } else {
                toast.error("Erreur lors de la suppression")
            }
        } catch {
            toast.error("Erreur de connexion")
        } finally {
            setSuppressionEnCours(null)
        }
    }

    if (ventes.length === 0) {
        return (
            <div className="text-center py-8 sm:py-12">
                <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Aucune vente</h3>
                <p className="text-sm text-gray-500">Les ventes enregistrées apparaîtront ici</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Recherche */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Rechercher une vente..."
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        className="pl-10"
                    />
                </div>
                {recherche && (
                    <Badge variant="secondary" className="w-fit">
                        {ventesFiltrees.length} résultat{ventesFiltrees.length > 1 ? "s" : ""} • {totalFiltre.toFixed(2)} €
                    </Badge>
                )}
            </div>

            {/* Vue Desktop */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b text-left text-sm text-gray-500">
                            <th className="pb-3 font-medium">Date</th>
                            <th className="pb-3 font-medium">Description</th>
                            <th className="pb-3 font-medium">Enregistré par</th>
                            <th className="pb-3 font-medium text-right">Montant</th>
                            <th className="pb-3 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {ventesFiltrees.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-500">Aucun résultat</td>
                            </tr>
                        ) : (
                            ventesFiltrees.map((vente) => (
                                <tr key={vente.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 text-sm whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-gray-400 hidden lg:block" />
                                            <div>
                                                <p className="font-medium">
                                                    {format(getDateValue(vente.dateVente), "dd/MM/yyyy", { locale: fr })}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {format(getDateValue(vente.dateVente), "HH:mm", { locale: fr })}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 text-sm max-w-[200px] truncate">
                                        {vente.description || "-"}
                                    </td>
                                    <td className="py-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <User className="h-3.5 w-3.5 text-gray-400 hidden lg:block" />
                                            <span>{vente.enregistrePar.prenom || ""} {vente.enregistrePar.nom}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-sm text-right">
                                        <Badge variant="default" className="font-mono">
                                            {vente.montant.toFixed(2)} FCFA
                                        </Badge>
                                    </td>
                                    <td className="py-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => supprimerVente(vente.id)}
                                            disabled={suppressionEnCours === vente.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Vue Mobile */}
            <div className="sm:hidden space-y-3">
                {ventesFiltrees.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">Aucun résultat</p>
                ) : (
                    ventesFiltrees.map((vente) => (
                        <div key={vente.id} className="bg-white border rounded-lg p-4 space-y-3 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(getDateValue(vente.dateVente), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                                </div>
                                <Badge variant="default" className="font-mono text-sm">
                                    {vente.montant.toFixed(2)} €
                                </Badge>
                            </div>
                            {vente.description && (
                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{vente.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <User className="h-3.5 w-3.5" />
                                    <span>{vente.enregistrePar.prenom || ""} {vente.enregistrePar.nom}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 h-8"
                                    onClick={() => supprimerVente(vente.id)}
                                    disabled={suppressionEnCours === vente.id}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    <span className="text-xs">Supprimer</span>
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Résumé */}
            {ventesFiltrees.length > 0 && (
                <div className="flex justify-between items-center pt-4 border-t text-sm text-gray-500">
                    <span>{ventesFiltrees.length} vente{ventesFiltrees.length > 1 ? "s" : ""}</span>
                    <span className="font-medium text-gray-700">Total: {totalFiltre.toFixed(2)} FCFA</span>
                </div>
            )}
        </div>
    )
}