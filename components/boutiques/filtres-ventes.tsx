// src/components/boutiques/filtres-ventes.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Filter, X } from "lucide-react"
import { format } from "date-fns"

export type ModeFitre = "jour" | "mois" | "annee" | "periode"

export interface FiltreVentesValeur {
  mode: ModeFitre
  dateJour: string
  dateMois: string
  dateAnnee: string
  dateDebut: string
  dateFin: string
}

interface Props {
  valeur: FiltreVentesValeur
  onChange: (valeur: FiltreVentesValeur) => void
}

export function FiltresVentes({ valeur, onChange }: Props) {
  const { mode, dateJour, dateMois, dateAnnee, dateDebut, dateFin } = valeur

  const set = (partial: Partial<FiltreVentesValeur>) =>
    onChange({ ...valeur, ...partial })

  const reinitialiser = () =>
    onChange({
      mode: "jour",
      dateJour: format(new Date(), "yyyy-MM-dd"),
      dateMois: format(new Date(), "yyyy-MM"),
      dateAnnee: new Date().getFullYear().toString(),
      dateDebut: "",
      dateFin: "",
    })

  const aDesFiltres =
    mode !== "jour" ||
    dateJour !== format(new Date(), "yyyy-MM-dd")

  return (
    <div className="flex flex-col gap-3 items-start w-full">

      {/* Ligne 1 : titre + réinitialiser */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500 shrink-0" />
        <span className="font-medium text-sm">Filtrer par</span>
        {aDesFiltres && (
          <Button variant="ghost" size="sm" onClick={reinitialiser} className="text-red-500 h-7 px-2">
            <X className="h-3 w-3 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Ligne 2 : boutons de mode */}
      <div className="flex flex-wrap gap-1.5">
        {([
          { valeur: "jour",    label: "Jour" },
          { valeur: "mois",    label: "Mois" },
          { valeur: "annee",   label: "Année" },
          { valeur: "periode", label: "Période" },
        ] as const).map((m) => (
          <Button
            key={m.valeur}
            variant={mode === m.valeur ? "default" : "outline"}
            size="sm"
            onClick={() => set({ mode: m.valeur })}
            className="h-8 text-xs"
          >
            {m.label}
          </Button>
        ))}
      </div>

      {/* Ligne 3 : champ(s) */}
      <div className="flex flex-wrap gap-2 items-end w-full">
        {mode === "jour" && (
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <Label className="text-xs text-gray-500">Date</Label>
            <Input
              type="date"
              value={dateJour}
              max={format(new Date(), "yyyy-MM-dd")}
              className="h-9 text-sm"
              onChange={(e) => set({ dateJour: e.target.value })}
            />
          </div>
        )}

        {mode === "mois" && (
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <Label className="text-xs text-gray-500">Mois</Label>
            <Input
              type="month"
              value={dateMois}
              max={format(new Date(), "yyyy-MM")}
              className="h-9 text-sm"
              onChange={(e) => set({ dateMois: e.target.value })}
            />
          </div>
        )}

        {mode === "annee" && (
          <div className="flex flex-col gap-1 w-full sm:w-32">
            <Label className="text-xs text-gray-500">Année</Label>
            <select
              value={dateAnnee}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(e) => set({ dateAnnee: e.target.value })}
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}

        {mode === "periode" && (
          <>
            <div className="flex flex-col gap-1 w-full sm:w-40">
              <Label className="text-xs text-gray-500">Du</Label>
              <Input
                type="date"
                value={dateDebut}
                className="h-9 text-sm"
                onChange={(e) => set({ dateDebut: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-40">
              <Label className="text-xs text-gray-500">Au</Label>
              <Input
                type="date"
                value={dateFin}
                className="h-9 text-sm"
                onChange={(e) => set({ dateFin: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      {/* Ligne 4 : raccourcis rapides */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="outline" size="sm" className="h-7 text-xs"
          onClick={() => set({ mode: "jour", dateJour: format(new Date(), "yyyy-MM-dd") })}
        >
          Aujourd'hui
        </Button>
        <Button
          variant="outline" size="sm" className="h-7 text-xs"
          onClick={() => set({ mode: "jour", dateJour: format(new Date(Date.now() - 86400000), "yyyy-MM-dd") })}
        >
          Hier
        </Button>
        <Button
          variant="outline" size="sm" className="h-7 text-xs"
          onClick={() => set({ mode: "mois", dateMois: format(new Date(), "yyyy-MM") })}
        >
          Ce mois
        </Button>
        <Button
          variant="outline" size="sm" className="h-7 text-xs"
          onClick={() => set({ mode: "annee", dateAnnee: new Date().getFullYear().toString() })}
        >
          Cette année
        </Button>
      </div>
    </div>
  )
}
