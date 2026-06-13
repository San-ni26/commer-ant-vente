// src/components/boutiques/filtres-ventes.tsx
"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Filter, X } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { fr } from "date-fns/locale"

export function FiltresVentes() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [mode, setMode] = useState<"jour" | "mois" | "annee" | "periode">("jour")
    const [dateJour, setDateJour] = useState(searchParams.get("date") || format(new Date(), "yyyy-MM-dd"))
    const [dateMois, setDateMois] = useState(searchParams.get("mois") || format(new Date(), "yyyy-MM"))
    const [dateAnnee, setDateAnnee] = useState(searchParams.get("annee") || new Date().getFullYear().toString())
    const [dateDebut, setDateDebut] = useState(searchParams.get("debut") || "")
    const [dateFin, setDateFin] = useState(searchParams.get("fin") || "")

    const filtrer = () => {
        const params = new URLSearchParams()

        switch (mode) {
            case "jour":
                params.set("date", dateJour)
                break
            case "mois":
                params.set("mois", dateMois)
                break
            case "annee":
                params.set("annee", dateAnnee)
                break
            case "periode":
                params.set("debut", dateDebut)
                params.set("fin", dateFin)
                break
        }

        router.push(`${pathname}?${params.toString()}`)
    }

    const reinitialiser = () => {
        router.push(pathname)
    }

    const aDesFiltres = searchParams.toString().length > 0

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-medium text-sm">Filtrer par</span>
                {aDesFiltres && (
                    <Button variant="ghost" size="sm" onClick={reinitialiser} className="text-red-500">
                        <X className="h-3 w-3 mr-1" />
                        Réinitialiser
                    </Button>
                )}
            </div>

            {/* Sélecteur de mode */}
            <div className="flex flex-wrap gap-2">
                {([
                    { valeur: "jour", label: "Jour" },
                    { valeur: "mois", label: "Mois" },
                    { valeur: "annee", label: "Année" },
                    { valeur: "periode", label: "Période" },
                ] as const).map((m) => (
                    <Button
                        key={m.valeur}
                        variant={mode === m.valeur ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMode(m.valeur)}
                    >
                        {m.label}
                    </Button>
                ))}
            </div>

            {/* Champs selon le mode */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
                {mode === "jour" && (
                    <div className="flex-1">
                        <Label className="text-xs">Date</Label>
                        <Input
                            type="date"
                            value={dateJour}
                            onChange={(e) => setDateJour(e.target.value)}
                            max={format(new Date(), "yyyy-MM-dd")}
                        />
                    </div>
                )}

                {mode === "mois" && (
                    <div className="flex-1">
                        <Label className="text-xs">Mois</Label>
                        <Input
                            type="month"
                            value={dateMois}
                            onChange={(e) => setDateMois(e.target.value)}
                            max={format(new Date(), "yyyy-MM")}
                        />
                    </div>
                )}

                {mode === "annee" && (
                    <div className="flex-1">
                        <Label className="text-xs">Année</Label>
                        <select
                            value={dateAnnee}
                            onChange={(e) => setDateAnnee(e.target.value)}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((annee) => (
                                <option key={annee} value={annee}>{annee}</option>
                            ))}
                        </select>
                    </div>
                )}

                {mode === "periode" && (
                    <>
                        <div className="flex-1">
                            <Label className="text-xs">Du</Label>
                            <Input
                                type="date"
                                value={dateDebut}
                                onChange={(e) => setDateDebut(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <Label className="text-xs">Au</Label>
                            <Input
                                type="date"
                                value={dateFin}
                                onChange={(e) => setDateFin(e.target.value)}
                            />
                        </div>
                    </>
                )}

                <Button onClick={filtrer} className="w-full sm:w-auto">
                    <Calendar className="h-4 w-4 mr-2" />
                    Appliquer
                </Button>
            </div>

            {/* Filtres rapides */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const aujourdhui = format(new Date(), "yyyy-MM-dd")
                        router.push(`${pathname}?date=${aujourdhui}`)
                    }}
                >
                    Aujourd'hui
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const hier = format(new Date(Date.now() - 86400000), "yyyy-MM-dd")
                        router.push(`${pathname}?date=${hier}`)
                    }}
                >
                    Hier
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const mois = format(new Date(), "yyyy-MM")
                        router.push(`${pathname}?mois=${mois}`)
                    }}
                >
                    Ce mois
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        const annee = new Date().getFullYear().toString()
                        router.push(`${pathname}?annee=${annee}`)
                    }}
                >
                    Cette année
                </Button>
            </div>
        </div>
    )
}