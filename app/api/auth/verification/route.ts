// src/app/api/auth/verification/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const token = searchParams.get("token")

        if (!token) {
            return NextResponse.redirect(new URL('/verification-email?erreur=token_manquant', req.url))
        }

        const utilisateur = await prisma.utilisateur.findFirst({
            where: {
                tokenVerification: token,
                emailVerifie: false,
            }
        })

        if (!utilisateur) {
            return NextResponse.redirect(new URL('/verification-email?erreur=token_invalide', req.url))
        }

        if (utilisateur.dateExpirationToken && utilisateur.dateExpirationToken < new Date()) {
            return NextResponse.redirect(new URL('/verification-email?erreur=token_expire', req.url))
        }

        // Activer le compte
        await prisma.utilisateur.update({
            where: { id: utilisateur.id },
            data: {
                emailVerifie: true,
                tokenVerification: null,
                dateExpirationToken: null,
            }
        })

        // Rediriger vers la page de succès
        return NextResponse.redirect(new URL('/verification-succes', req.url))
    } catch (error) {
        console.error("Erreur vérification:", error)
        return NextResponse.redirect(new URL('/verification-email?erreur=serveur', req.url))
    }
}