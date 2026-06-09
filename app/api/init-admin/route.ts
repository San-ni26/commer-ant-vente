// src/app/api/init-admin/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
    try {
        const motDePasse = await bcrypt.hash('Paulkone2617', 12)

        const admin = await prisma.utilisateur.upsert({
            where: { email: 'admin@commercevente.com' },
            update: {},
            create: {
                email: 'admin@commercevente.com',
                motDePasse,
                nom: 'Admin Paul',
                prenom: 'Koné',
                telephone: '0000000000',
                role: 'ADMIN',
                emailVerifie: true,
            },
        })

        return NextResponse.json({
            message: "Admin créé",
            email: admin.email,
            motDePasse: "admin123"
        })
    } catch (error) {
        return NextResponse.json({ erreur: "Erreur" }, { status: 500 })
    }
}