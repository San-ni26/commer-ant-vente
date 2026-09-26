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
import { formatMontant } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { mutationOffline } from "@/lib/offline/fetch-offline"
import { saveTransactionLocale, deleteTransactionLocale } from "@/lib/offline/db"

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
    const [listeTransactions, setListeTransactions] = useState<Transaction[]>(transactions)
    const [recherche, setRecherche] = useState("")
    const [actionEnCours, setActionEnCours] = useState<string | null>(null)
    const [filtreStatut, setFiltreStatut] = useState<"tous" | "verifie" | "attente">("tous")

    // Filtrer VIREMENT_BANCAIRE et RETRAIT — on n'affiche que VERSEMENT et DEPENSE
    const transactionsFiltrees = listeTransactions
    .filter(t => t.type === "VERSEMENT" || t.type === "DEPENSE")
    .filter(t => {
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

        const result = await mutationOffline({
            url: `/api/boutiques/${boutiqueId}/transactions`,
            method: 'PUT',
            body: { transactionId: id, action: 'valider' },
            tag: 'transaction:valider',
            donneeLocale: id,
            onOffline: (txId) => {
                setListeTransactions((prev) => prev.map(t => t.id === txId ? { ...t, verifiee: true } : t))
                toast.warning('Validation enregistrée localement')
            },
            onSuccess: async (data: any) => {
                if (data) await saveTransactionLocale({ ...data, syncedAt: Date.now() })
            },
        })

        if (result.source === 'network') {
            if (result.ok) {
                setListeTransactions((prev) => prev.map(t => t.id === id ? { ...t, verifiee: true } : t))
                toast.success('Transaction validée')
            } else {
                toast.error('Erreur lors de la validation')
            }
        }

        setActionEnCours(null)
    }

    const annulerTransaction = async (id: string) => {
        if (!confirm("Annuler la validation ?")) return
        setActionEnCours(id)

        const result = await mutationOffline({
            url: `/api/boutiques/${boutiqueId}/transactions`,
            method: 'PUT',
            body: { transactionId: id, action: 'annuler' },
            tag: 'transaction:annuler',
            donneeLocale: id,
            onOffline: (txId) => {
                setListeTransactions((prev) => prev.map(t => t.id === txId ? { ...t, verifiee: false } : t))
                toast.warning('Annulation enregistrée localement')
            },
            onSuccess: async (data: any) => {
                if (data) await saveTransactionLocale({ ...data, syncedAt: Date.now() })
            },
        })

        if (result.source === 'network') {
            if (result.ok) {
                setListeTransactions((prev) => prev.map(t => t.id === id ? { ...t, verifiee: false } : t))
                toast.success('Validation annulée')
            } else {
                toast.error('Erreur lors de l\'annulation')
            }
        }

        setActionEnCours(null)
    }

    const supprimerTransaction = async (id: string) => {
        if (!confirm("Supprimer définitivement ?")) return
        setActionEnCours(id)

        const result = await mutationOffline({
            url: `/api/boutiques/${boutiqueId}/transactions?transactionId=${id}`,
            method: 'DELETE',
            tag: 'transaction:supprimer',
            donneeLocale: id,
            onOffline: (txId) => {
                setListeTransactions((prev) => prev.filter(t => t.id !== txId))
                toast.warning('Suppression enregistrée localement')
            },
            onSuccess: async () => {
                await deleteTransactionLocale(id)
            },
        })

        if (result.source === 'network') {
            if (result.ok) {
                setListeTransactions((prev) => prev.filter(t => t.id !== id))
                await deleteTransactionLocale(id)
                toast.success('Transaction supprimée')
            } else {
                toast.error('Erreur lors de la suppression')
            }
        }

        setActionEnCours(null)
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
                                <td className="py-3 text-sm">
                                    <Badge className={t.type === "VERSEMENT"
                                        ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                        : "bg-red-100 text-red-800 hover:bg-red-100"
                                    }>
                                        {t.type === "VERSEMENT" ? "Versement" : "Dépense"}
                                    </Badge>
                                </td>
                                <td className="py-3 text-sm max-w-[200px] truncate">{t.description || "-"}</td>
                                <td className={`py-3 text-sm text-right font-bold ${t.type === "VERSEMENT" ? "text-orange-600" : "text-red-600"}`}>
                                    -{formatMontant(t.montant)}
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
                        {/* Totaux dans le tableau */}
                        {transactionsFiltrees.length > 0 && (() => {
                            const totalV = transactionsFiltrees.filter(t => t.type === "VERSEMENT").reduce((s, t) => s + t.montant, 0)
                            const totalD = transactionsFiltrees.filter(t => t.type === "DEPENSE").reduce((s, t) => s + t.montant, 0)
                            const total = totalV + totalD
                            const cols = estCommercant ? 6 : 5
                            return (
                                <>
                                    <tr className="bg-gray-50 border-t">
                                        <td colSpan={3} className="py-2 text-sm text-gray-500 pl-1">Versements</td>
                                        <td className="py-2 text-right text-sm font-semibold text-orange-600">-{formatMontant(totalV)}</td>
                                        <td colSpan={cols - 4} />
                                    </tr>
                                    <tr className="bg-gray-50">
                                        <td colSpan={3} className="py-2 text-sm text-gray-500 pl-1">Dépenses</td>
                                        <td className="py-2 text-right text-sm font-semibold text-red-600">-{formatMontant(totalD)}</td>
                                        <td colSpan={cols - 4} />
                                    </tr>
                                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                                        <td colSpan={3} className="py-2.5 text-sm font-bold text-gray-800 pl-1">Total transactions</td>
                                        <td className="py-2.5 text-right text-sm font-bold text-gray-900">-{formatMontant(total)}</td>
                                        <td colSpan={cols - 4} />
                                    </tr>
                                </>
                            )
                        })()}
                    </tbody>
                </table>
            </div>

            {/* Liste mobile */}
            <div className="sm:hidden space-y-3">
                {transactionsFiltrees.map((t) => (
                    <div key={t.id} className="bg-white border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm font-medium">
                                {t.type === "VERSEMENT" ? "Versement" : "Dépense"}
                            </span>
                            <span className={`font-bold ${t.type === "VERSEMENT" ? "text-orange-600" : "text-red-600"}`}>
                                -{formatMontant(t.montant)}
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

            {/* Totaux fixes en bas */}
            {transactionsFiltrees.length > 0 && (() => {
                const totalVersements = transactionsFiltrees
                    .filter(t => t.type === "VERSEMENT")
                    .reduce((s, t) => s + t.montant, 0)
                const totalDepenses = transactionsFiltrees
                    .filter(t => t.type === "DEPENSE")
                    .reduce((s, t) => s + t.montant, 0)
                const total = totalVersements + totalDepenses

                return (
                    <div className="border-t bg-gray-50 rounded-b-lg px-4 py-3 space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total versements</span>
                            <span className="font-semibold text-orange-600">-{formatMontant(totalVersements)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total dépenses</span>
                            <span className="font-semibold text-red-600">-{formatMontant(totalDepenses)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1.5">
                            <span className="text-sm font-medium text-gray-700">Total transactions</span>
                            <span className="text-base font-bold text-gray-900">-{formatMontant(total)}</span>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}