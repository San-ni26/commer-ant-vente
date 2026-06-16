// src/app/api/auth/reset-password/request/route.ts
import { NextResponse } from "next/server"
import { prisma, avecRetry } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"
import { envoyerEmailReinitialisation } from "@/lib/email"

const schemaDemande = z.object({
  email: z.string().email("Adresse email invalide"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = schemaDemande.parse(body)

    // Rechercher l'utilisateur avec retry
    const utilisateur = await avecRetry(() =>
      prisma.utilisateur.findUnique({
        where: { email },
      })
    )

    // Toujours renvoyer un succès pour des raisons de sécurité (éviter l'énumération d'emails)
    if (!utilisateur) {
      return NextResponse.json(
        { message: "Si cette adresse email existe, un message de réinitialisation y a été envoyé." },
        { status: 200 }
      )
    }

    const token = crypto.randomBytes(32).toString("hex")
    const dateExpiration = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

    // Enregistrer le token en DB avec retry
    await avecRetry(() =>
      prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: {
          tokenReinitialisation: token,
          dateExpirationToken: dateExpiration,
        },
      })
    )

    // Envoyer l'email
    try {
      await envoyerEmailReinitialisation(email, token)
    } catch (emailError) {
      console.error("⚠️ Erreur lors de l'envoi de l'e-mail de réinitialisation :", emailError)
    }

    // Afficher dans la console pour faciliter le dev local
    const lienReinitialisation = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reinitialiser-mot-de-passe?token=${token}`
    console.log("📧 Lien de réinitialisation de mot de passe (dev) :", lienReinitialisation)

    return NextResponse.json(
      { message: "Si cette adresse email existe, un message de réinitialisation y a été envoyé." },
      { status: 200 }
    )
  } catch (error) {
    console.error("❌ Erreur demande de réinitialisation :", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erreur: "Données invalides", details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { erreur: "Une erreur est survenue lors de la demande." },
      { status: 500 }
    )
  }
}
