// src/lib/validations.ts
import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  shopName: z.string().min(2, "Le nom de la boutique est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

export const saleSchema = z.object({
  amount: z.number().positive("Le montant doit être positif"),
  description: z.string().optional(),
  shopId: z.string(),
})

export const transactionSchema = z.object({
  type: z.enum(["DEPOSIT", "EXPENSE", "BANK_TRANSFER", "WITHDRAWAL"]),
  amount: z.number().positive("Le montant doit être positif"),
  description: z.string().optional(),
  reference: z.string().optional(),
  shopId: z.string(),
})