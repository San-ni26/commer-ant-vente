// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"
import { envoyerEmailVerification } from "@/lib/email"

const schemaInscription = z.object({
  nom: z.string().min(2),
  prenom: z.string().optional().default(""),
  email: z.string().email(),
  telephone: z.string().min(10),
  nomBoutique: z.string().min(2),
  motDePasse: z.string().min(8),
  confirmationMotDePasse: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const donnees = schemaInscription.parse(body)

    if (donnees.motDePasse !== donnees.confirmationMotDePasse) {
      return NextResponse.json(
        { erreur: "Les mots de passe ne correspondent pas" },
        { status: 400 }
      )
    }

    const utilisateurExistant = await prisma.utilisateur.findUnique({
      where: { email: donnees.email }
    })

    if (utilisateurExistant) {
      return NextResponse.json(
        { erreur: "Cet email est déjà utilisé" },
        { status: 400 }
      )
    }

    const motDePasseHash = await bcrypt.hash(donnees.motDePasse, 12)
    const tokenVerification = crypto.randomBytes(32).toString("hex")
    const dateExpiration = new Date()
    dateExpiration.setHours(dateExpiration.getHours() + 24)
    const dateFinEssai = new Date()
    dateFinEssai.setDate(dateFinEssai.getDate() + 7)

    // Créer l'utilisateur avec transaction
    const resultat = await prisma.$transaction(async (tx) => {
      const user = await tx.utilisateur.create({
        data: {
          email: donnees.email,
          motDePasse: motDePasseHash,
          nom: donnees.nom,
          prenom: donnees.prenom || "",
          telephone: donnees.telephone,
          tokenVerification,
          dateExpirationToken: dateExpiration,
        }
      })

      const boutique = await tx.boutique.create({
        data: {
          nom: donnees.nomBoutique,
          commercantId: user.id,
        }
      })

      const abonnement = await tx.abonnement.create({
        data: {
          boutiqueId: boutique.id,
          commercantId: user.id,
          duree: "UN_MOIS",
          statut: "ACTIF",
          dateDebut: new Date(),
          dateFin: dateFinEssai,
          montant: 0,
        }
      })

      return { user, boutique, abonnement }
    })

    // Envoyer l'email de vérification (ne pas bloquer si erreur)
    try {
      await envoyerEmailVerification(donnees.email, tokenVerification)
      console.log('✅ Email de vérification envoyé à:', donnees.email)
    } catch (emailError) {
      console.error('⚠️ Erreur envoi email (compte créé quand même):', emailError)
    }

    // Afficher le lien dans la console pour le développement
    const lienDev = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verification?token=${tokenVerification}`
    console.log('📧 Lien de vérification (dev):', lienDev)

    return NextResponse.json(
      {
        message: "Compte créé avec succès. Vérifiez votre email.",
        utilisateurId: resultat.user.id,
        lienVerification: lienDev // À retirer en production
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("❌ Erreur inscription:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erreur: "Données invalides", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { erreur: "Erreur serveur" },
      { status: 500 }
    )
  }
}