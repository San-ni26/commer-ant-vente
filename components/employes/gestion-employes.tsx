// src/components/employes/gestion-employes.tsx
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
import { Plus, Trash2, Copy, Check, Loader2, User, Store, Phone } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { mutationOffline } from "@/lib/offline/fetch-offline"
import { saveEmployeLocal, deleteEmployeLocal } from "@/lib/offline/db"

interface Employe {
    id: string
    nom: string
    prenom: string | null
    telephone: string
    code: string
    boutique: {
        id: string
        nom: string
    } | null
}

interface Boutique {
    id: string
    nom: string
}

export function GestionEmployes({
    employes,
    boutiques,
    onRefresh,
}: {
    employes: Employe[]
    boutiques: Boutique[]
    onRefresh?: () => void
}) {
    const router = useRouter()
    const [listeEmployes, setListeEmployes] = useState<Employe[]>(employes)
    const [ouvert, setOuvert] = useState(false)
    const [chargement, setChargement] = useState(false)
    const [donnees, setDonnees] = useState({
        nom: "",
        prenom: "",
        telephone: "",
        boutiqueId: "",
    })
    const [codeCopie, setCodeCopie] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setChargement(true)

        const idTemp = `temp_employe_${Date.now()}`
        const boutique = boutiques.find(b => b.id === donnees.boutiqueId) || null
        const employeTmp: Employe = {
            id: idTemp,
            nom: donnees.nom,
            prenom: donnees.prenom || null,
            telephone: donnees.telephone,
            code: '????',
            boutique,
        }

        const result = await mutationOffline({
            url: '/api/employes',
            method: 'POST',
            body: donnees,
            tag: 'employe:creer',
            localId: idTemp,
            donneeLocale: employeTmp,
            onOffline: (emp) => {
                setListeEmployes((prev) => [...prev, emp])
                toast.warning('Employé enregistré localement — synchronisation dès la reconnexion')
            },
            onSuccess: async (data: any) => {
                await saveEmployeLocal({ ...data, syncedAt: Date.now() })
            },
        })

        if (result.source === 'network') {
            if (result.ok) {
                const data = result.data as any
                setListeEmployes((prev) => [...prev, { ...employeTmp, id: data.id, code: data.code }])
                toast.success('Employé créé avec succès')
            } else {
                toast.error(result.error || 'Erreur lors de la création')
                setChargement(false)
                return
            }
        }

        setOuvert(false)
        setDonnees({ nom: '', prenom: '', telephone: '', boutiqueId: '' })
        setChargement(false)
        onRefresh?.()
    }

    const supprimerEmploye = async (id: string) => {
        if (!confirm("Supprimer cet employé ?")) return

        const result = await mutationOffline({
            url: `/api/employes?id=${id}`,
            method: 'DELETE',
            tag: 'employe:supprimer',
            donneeLocale: id,
            onOffline: (empId) => {
                setListeEmployes((prev) => prev.filter(e => e.id !== empId))
                toast.warning('Suppression enregistrée localement')
            },
            onSuccess: async () => {
                await deleteEmployeLocal(id)
            },
        })

        if (result.source === 'network') {
            if (result.ok) {
                setListeEmployes((prev) => prev.filter(e => e.id !== id))
                await deleteEmployeLocal(id)
                toast.success('Employé supprimé')
            } else {
                toast.error(result.error || 'Erreur lors de la suppression')
            }
        }

        onRefresh?.()
    }

    const copierCode = (code: string) => {
        navigator.clipboard.writeText(code)
        setCodeCopie(code)
        toast.success("Code copié !")
        setTimeout(() => setCodeCopie(null), 2000)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={ouvert} onOpenChange={setOuvert}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Nouvel Employé
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer un employé</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Nom *</Label>
                                    <Input
                                        required
                                        value={donnees.nom}
                                        onChange={(e) => setDonnees({ ...donnees, nom: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Prénom</Label>
                                    <Input
                                        value={donnees.prenom}
                                        onChange={(e) => setDonnees({ ...donnees, prenom: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Téléphone *</Label>
                                <Input
                                    required
                                    type="tel"
                                    value={donnees.telephone}
                                    onChange={(e) => setDonnees({ ...donnees, telephone: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Boutique</Label>
                                <Select value={donnees.boutiqueId} onValueChange={(v) => setDonnees({ ...donnees, boutiqueId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une boutique" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {boutiques.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>{b.nom}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button type="button" variant="outline" onClick={() => setOuvert(false)}>
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
            </div>

            {listeEmployes.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Aucun employé</h3>
                        <p className="text-gray-500">Créez votre premier employé</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {listeEmployes.map((employe) => (
                        <Card key={employe.id}>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold">
                                            {employe.prenom} {employe.nom}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                            <Phone className="h-3 w-3" />
                                            {employe.telephone}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => supprimerEmploye(employe.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                {employe.boutique && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                                        <Store className="h-3 w-3" />
                                        {employe.boutique.nom}
                                    </div>
                                )}

                                <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500">Code d'accès</p>
                                        <p className="font-mono font-bold text-lg">{employe.code}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copierCode(employe.code)}
                                    >
                                        {codeCopie === employe.code ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}