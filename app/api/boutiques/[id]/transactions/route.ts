// src/app/api/boutiques/[id]/transactions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

// Schéma de validation pour la création
const schemaTransaction = z.object({
  type: z.enum(["VERSEMENT", "DEPENSE", "VIREMENT_BANCAIRE", "RETRAIT"]),
  montant: z.number().positive("Le montant doit être positif"),
  description: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
    }

    const { id } = await context.params

    const transactions = await prisma.transaction.findMany({
      where: { boutiqueId: id },
      include: {
        verifieePar: {
          select: { nom: true, prenom: true }
        }
      },
      orderBy: { dateTransaction: 'desc' },
      take: 50
    })

    return NextResponse.json(transactions)
  } catch (erreur) {
    console.error("Erreur GET transactions:", erreur)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
    }

    const { id } = await context.params
    const corps = await request.json()

    // Valider les données
    const donneesValidees = schemaTransaction.parse(corps)

    // Créer la transaction (toujours en attente)
    const transaction = await prisma.transaction.create({
      data: {
        type: donneesValidees.type,
        montant: donneesValidees.montant,
        description: donneesValidees.description || null,
        boutiqueId: id,
        verifiee: false,
      },
      include: {
        verifieePar: {
          select: { nom: true, prenom: true }
        }
      }
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (erreur) {
    console.error("Erreur POST transaction:", erreur)

    if (erreur instanceof z.ZodError) {
      return NextResponse.json(
        { erreur: "Données invalides", details: erreur.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { erreur: "Erreur lors de la création de la transaction" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
    }

    const corps = await request.json()
    const { transactionId, action } = corps

    if (!transactionId || !action) {
      return NextResponse.json({ erreur: "Données manquantes" }, { status: 400 })
    }

    // Récupérer la transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    })

    if (!transaction) {
      return NextResponse.json({ erreur: "Transaction non trouvée" }, { status: 404 })
    }

    if (action === "valider") {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transactionId },
          data: {
            verifiee: true,
            verifieeParId: session.user.id,
          }
        }),
        prisma.boutique.update({
          where: { id: transaction.boutiqueId },
          data: {
            solde: ["VERSEMENT", "VIREMENT_BANCAIRE"].includes(transaction.type)
              ? { increment: transaction.montant }
              : { decrement: transaction.montant }
          }
        })
      ])
    } else if (action === "annuler") {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transactionId },
          data: {
            verifiee: false,
            verifieeParId: null,
          }
        }),
        prisma.boutique.update({
          where: { id: transaction.boutiqueId },
          data: {
            solde: ["VERSEMENT", "VIREMENT_BANCAIRE"].includes(transaction.type)
              ? { decrement: transaction.montant }
              : { increment: transaction.montant }
          }
        })
      ])
    }

    return NextResponse.json({ message: "OK" })
  } catch (erreur) {
    console.error("Erreur PUT transaction:", erreur)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get("transactionId")

    if (!transactionId) {
      return NextResponse.json({ erreur: "ID manquant" }, { status: 400 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    })

    if (!transaction) {
      return NextResponse.json({ erreur: "Non trouvée" }, { status: 404 })
    }

    // Si vérifiée, corriger le solde
    if (transaction.verifiee) {
      await prisma.$transaction([
        prisma.transaction.delete({ where: { id: transactionId } }),
        prisma.boutique.update({
          where: { id: transaction.boutiqueId },
          data: {
            solde: ["VERSEMENT", "VIREMENT_BANCAIRE"].includes(transaction.type)
              ? { decrement: transaction.montant }
              : { increment: transaction.montant }
          }
        })
      ])
    } else {
      await prisma.transaction.delete({ where: { id: transactionId } })
    }

    return NextResponse.json({ message: "Supprimée" })
  } catch (erreur) {
    console.error("Erreur DELETE transaction:", erreur)
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
  }
}