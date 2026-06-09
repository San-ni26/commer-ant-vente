// src/components/transactions/liste-transactions.tsx
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Search,
    Calendar,
    CheckCircle,
    XCircle,
    Trash2,
    Clock,
    ArrowUpCircle,
    ArrowDownCircle,
    Banknote,
    Loader2
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Type assoupli pour accepter les données Prisma
type Transaction = {
    id: string
    type: string
    montant: number
    description: string | null
    reference?: string | null
    verifiee: boolean
    dateTransaction: Date | string
    verifieePar?: {
        nom: string
        prenom?: string | null
    } | null
}

interface ListeTransactionsProps {
    transactions: Transaction[]
    boutiqueId: string
    estCommercant?: boolean
}

export function ListeTransactions({
    transactions,
    boutiqueId,
    estCommercant = true
}: ListeTransactionsProps) {
    const router = useRouter()
    const [recherche, setRecherche] = useState("")
    const [actionEnCours, setActionEnCours] = useState<string | null>(null)
    const [filtreStatut, setFiltreStatut] = useState<"tous" | "verifie" | "attente">("tous")

    const transactionsFiltrees = transactions.filter(t => {
        const matchRecherche =
            t.description?.toLowerCase().includes(recherche.toLowerCase()) ||
            t.type.toLowerCase().includes(recherche.toLowerCase()) ||
            t.montant.toString().includes(recherche)

        const matchStatut =
            filtreStatut === "tous" ||
            (filtreStatut === "verifie" && t.verifiee) ||
            (filtreStatut === "attente" && !t.verifiee)

        return matchRecherche && matchStatut
    })

    const validerTransaction = async (id: string) => {
        setActionEnCours(id)
        try {
            const reponse = await fetch(`/api/boutiques/${boutiqueId}/transactions`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transactionId: id, action: "valider" }),
            })

            if (reponse.ok) {
                toast.success("Transaction validée")
                router.refresh()
            } else {
                toast.error("Erreur lors de la validation")
            }
        } catch {
            toast.error("Erreur de connexion")
        } finally {
            setActionEnCours(null)
        }
    }

    const annulerTransaction = async (id: string) => {
        if (!confirm("Annuler la validation ?")) return
        setActionEnCours(id)
        try {
            const reponse = await fetch(`/api/boutiques/${boutiqueId}/transactions`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transactionId: id, action: "annuler" }),
            })
            if (reponse.ok) {
                toast.success("Validation annulée")
                router.refresh()
            }
        } catch {
            toast.error("Erreur")
        } finally {
            setActionEnCours(null)
        }
    }

    const supprimerTransaction = async (id: string) => {
        if (!confirm("Supprimer définitivement ?")) return
        setActionEnCours(id)
        try {
            const reponse = await fetch(`/api/boutiques/${boutiqueId}/transactions?transactionId=${id}`, {
                method: "DELETE",
            })
            if (reponse.ok) {
                toast.success("Transaction supprimée")
                router.refresh()
            }
        } catch {
            toast.error("Erreur")
        } finally {
            setActionEnCours(null)
        }
    }

    const getDateValue = (date: Date | string) => {
        return typeof date === 'string' ? new Date(date) : date
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-12">
                <Banknote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune transaction</h3>
                <p className="text-gray-500 text-sm">Les transactions apparaîtront ici</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Rechercher..."
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    {(["tous", "verifie", "attente"] as const).map((filtre) => (
                        <Button
                            key={filtre}
                            variant={filtreStatut === filtre ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFiltreStatut(filtre)}
                        >
                            {filtre === "tous" ? "Tous" : filtre === "verifie" ? "Vérifiés" : "En attente"}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Liste desktop */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b text-left text-sm text-gray-500">
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Type</th>
                            <th className="pb-3">Description</th>
                            <th className="pb-3 text-right">Montant</th>
                            <th className="pb-3">Statut</th>
                            {estCommercant && <th className="pb-3 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {transactionsFiltrees.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="py-3 text-sm">
                                    {format(getDateValue(t.dateTransaction), "dd/MM/yyyy HH:mm", { locale: fr })}
                                </td>
                                <td className="py-3 text-sm">{t.type}</td>
                                <td className="py-3 text-sm max-w-[200px] truncate">{t.description || "-"}</td>
                                <td className={`py-3 text-sm text-right font-bold ${["VERSEMENT", "VIREMENT_BANCAIRE"].includes(t.type) ? "text-green-600" : "text-red-600"
                                    }`}>
                                    {["VERSEMENT", "VIREMENT_BANCAIRE"].includes(t.type) ? "+" : "-"}{t.montant.toFixed(2)} FCFA
                                </td>
                                <td className="py-3">
                                    <Badge variant={t.verifiee ? "default" : "secondary"}>
                                        {t.verifiee ? "Vérifié" : "En attente"}
                                    </Badge>
                                </td>
                                {estCommercant && (
                                    <td className="py-3">
                                        <div className="flex justify-end gap-1">
                                            {!t.verifiee ? (
                                                <Button variant="ghost" size="icon" onClick={() => validerTransaction(t.id)} disabled={actionEnCours === t.id}>
                                                    {actionEnCours === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" onClick={() => annulerTransaction(t.id)}>
                                                    <XCircle className="h-4 w-4 text-orange-600" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => supprimerTransaction(t.id)} disabled={actionEnCours === t.id}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Liste mobile */}
            <div className="sm:hidden space-y-3">
                {transactionsFiltrees.map((t) => (
                    <div key={t.id} className="bg-white border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm">{t.type}</span>
                            <span className={`font-bold ${["VERSEMENT", "VIREMENT_BANCAIRE"].includes(t.type) ? "text-green-600" : "text-red-600"}`}>
                                {["VERSEMENT", "VIREMENT_BANCAIRE"].includes(t.type) ? "+" : "-"}{t.montant.toFixed(2)} €
                            </span>
                        </div>
                        <p className="text-xs text-gray-500">{format(getDateValue(t.dateTransaction), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                        {t.description && <p className="text-sm bg-gray-50 p-2 rounded">{t.description}</p>}
                        <div className="flex justify-between items-center">
                            <Badge variant={t.verifiee ? "default" : "secondary"}>{t.verifiee ? "Vérifié" : "En attente"}</Badge>
                            {estCommercant && (
                                <div className="flex gap-1">
                                    {!t.verifiee ? (
                                        <Button variant="outline" size="sm" onClick={() => validerTransaction(t.id)}>Valider</Button>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={() => annulerTransaction(t.id)}>Annuler</Button>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => supprimerTransaction(t.id)} className="text-red-500">Suppr.</Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}