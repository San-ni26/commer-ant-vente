// src/app/api/auth/reset-password/confirm/route.ts
import { NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schemaConfirmation = z.object({
  token: z.string().min(1, "Le jeton est requis"),
  nouveauMotDePasse: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
  confirmationMotDePasse: z.string().min(8, "La confirmation est requise"),
}).refine((data) => data.nouveauMotDePasse === data.confirmationMotDePasse, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmationMotDePasse"],
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const donnees = schemaConfirmation.parse(body)

    // Rechercher l'utilisateur associé au token avec retry
    const utilisateur = await avecRetry(() =>
      prisma.utilisateur.findFirst({
        where: {
          tokenReinitialisation: donnees.token,
        },
      })
    )

    if (!utilisateur) {
      return NextResponse.json(
        { erreur: "Lien de réinitialisation invalide ou expiré." },
        { status: 400 }
      )
    }

    // Vérifier l'expiration du token
    if (utilisateur.dateExpirationToken && utilisateur.dateExpirationToken < new Date()) {
      return NextResponse.json(
        { erreur: "Le lien de réinitialisation a expiré." },
        { status: 400 }
      )
    }

    // Hacher le nouveau mot de passe
    const motDePasseHash = await bcrypt.hash(donnees.nouveauMotDePasse, 12)

    // Mettre à jour l'utilisateur en effaçant le token
    await avecRetry(() =>
      prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: {
          motDePasse: motDePasseHash,
          tokenReinitialisation: null,
          dateExpirationToken: null,
        },
      })
    )

    return NextResponse.json(
      { message: "Votre mot de passe a été réinitialisé avec succès." },
      { status: 200 }
    )
  } catch (error) {
    console.error("❌ Erreur confirmation de réinitialisation :", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erreur: error.issues[0]?.message || "Données invalides", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { erreur: "Une erreur est survenue lors de la réinitialisation de votre mot de passe." },
      { status: 500 }
    )
  }
}
