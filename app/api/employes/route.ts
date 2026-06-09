// src/app/api/employes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import crypto from "crypto"

const schemaEmploye = z.object({
    nom: z.string().min(2),
    prenom: z.string().optional(),
    telephone: z.string().min(10),
    boutiqueId: z.string().optional(),
})

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
        }

        const employes = await prisma.employe.findMany({
            where: {
                boutique: {
                    commercantId: session.user.id
                }
            },
            include: {
                boutique: {
                    select: { id: true, nom: true }
                }
            }
        })

        return NextResponse.json(employes)
    } catch (erreur) {
        return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
        }

        const corps = await request.json()
        const donnees = schemaEmploye.parse(corps)

        // Générer un code unique de 4 chiffres
        const code = Math.floor(1000 + Math.random() * 9000).toString()

        // Vérifier que la boutique appartient au commerçant
        if (donnees.boutiqueId) {
            const boutique = await prisma.boutique.findFirst({
                where: { id: donnees.boutiqueId, commercantId: session.user.id }
            })
            if (!boutique) {
                return NextResponse.json({ erreur: "Boutique non trouvée" }, { status: 404 })
            }
        }

        const employe = await prisma.employe.create({
            data: {
                nom: donnees.nom,
                prenom: donnees.prenom || "",
                telephone: donnees.telephone,
                code,
                boutiqueId: donnees.boutiqueId || null,
            },
            include: {
                boutique: {
                    select: { id: true, nom: true }
                }
            }
        })

        return NextResponse.json(employe, { status: 201 })
    } catch (erreur) {
        if (erreur instanceof z.ZodError) {
            return NextResponse.json({ erreur: "Données invalides", details: erreur.issues }, { status: 400 })
        }
        return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ erreur: "ID manquant" }, { status: 400 })
        }

        await prisma.employe.delete({
            where: { id }
        })

        return NextResponse.json({ message: "Employé supprimé" })
    } catch (erreur) {
        return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 })
    }
}