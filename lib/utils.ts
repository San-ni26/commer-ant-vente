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