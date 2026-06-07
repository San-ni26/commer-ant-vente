// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"

const schemaInscription = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(8),
  nom: z.string().min(2),
  prenom: z.string().optional(),
  telephone: z.string().min(10),
  nomBoutique: z.string().min(2),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const donnees = schemaInscription.parse(body)

    // Vérifier si l'utilisateur existe déjà
    const utilisateurExistant = await prisma.utilisateur.findUnique({
      where: { email: donnees.email }
    })

    if (utilisateurExistant) {
      return NextResponse.json(
        { erreur: "Cet email est déjà utilisé" },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const motDePasseHash = await bcrypt.hash(donnees.motDePasse, 12)
    
    // Générer un token de vérification
    const tokenVerification = crypto.randomBytes(32).toString("hex")

    // Créer l'utilisateur avec sa boutique
    const utilisateur = await prisma.utilisateur.create({
      data: {
        email: donnees.email,
        motDePasse: motDePasseHash,
        nom: donnees.nom,
        prenom: donnees.prenom,
        telephone: donnees.telephone,
        tokenVerification,
        boutiques: {
          create: {
            nom: donnees.nomBoutique,
          }
        }
      }
    })

    // TODO: Envoyer l'email de vérification
    
    return NextResponse.json(
      { 
        message: "Compte créé avec succès. Vérifiez votre email pour activer votre compte.",
        utilisateurId: utilisateur.id
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          erreur: "Données invalides", 
          details: error.issues  // Changé de errors à issues
        },
        { status: 400 }
      )
    }
    
    console.error("Erreur lors de l'inscription:", error)
    return NextResponse.json(
      { erreur: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}