// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formate un montant en FCFA avec séparateurs de milliers (convention française)
 * Ex: 10000000.50 → "10 000 000,50 FCFA"
 */
export function formatMontant(valeur: number, options?: { decimales?: boolean; devise?: string }): string {
  const { decimales = true, devise = "FCFA" } = options ?? {}
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimales ? 2 : 0,
    maximumFractionDigits: decimales ? 2 : 0,
  }).format(valeur)
  return `${formatted} ${devise}`
}

/**
 * Retourne le nom complet de qui a enregistré une vente.
 * Priorité : nomEnregistrePar (stocké à la création) > enregistrePar (relation FK)
 * Affiche aussi le rôle entre parenthèses si c'est un employé.
 */
export function getNomAuteurVente(vente: {
  nomEnregistrePar?: string | null
  roleEnregistrePar?: string | null
  enregistrePar?: { nom: string; prenom?: string | null } | null
}): string {
  // 1. Utiliser le nom stocké directement (le plus fiable)
  if (vente.nomEnregistrePar) {
    const role = vente.roleEnregistrePar === "EMPLOYE" ? " (Employé)" : ""
    return `${vente.nomEnregistrePar}${role}`
  }

  // 2. Fallback sur la relation FK (anciennes ventes sans nomEnregistrePar)
  if (vente.enregistrePar) {
    const { nom, prenom } = vente.enregistrePar
    return `${prenom || ""} ${nom}`.trim()
  }

  return "—"
}
