// src/lib/auth-config.ts
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/connexion",
  },
  providers: [
    Credentials({
      id: "commercant",
      name: "Commerçant",
      credentials: {
        email: { label: "Email", type: "email" },
        motDePasse: { label: "Mot de passe", type: "password" },
        typeConnexion: { label: "Type", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.motDePasse) return null

        const utilisateur = await prisma.utilisateur.findUnique({
          where: { email: credentials.email as string }
        })

        if (!utilisateur || !utilisateur.emailVerifie) return null

        const valide = await bcrypt.compare(
          credentials.motDePasse as string,
          utilisateur.motDePasse
        )

        if (!valide) return null

        return {
          id: utilisateur.id,
          email: utilisateur.email,
          name: utilisateur.nom,
          role: utilisateur.role,
        }
      }
    }),
    Credentials({
      id: "employe",
      name: "Employé",
      credentials: {
        telephone: { label: "Téléphone", type: "tel" },
        code: { label: "Code", type: "text" },
        typeConnexion: { label: "Type", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.telephone || !credentials?.code) return null

        const employe = await prisma.employe.findFirst({
          where: {
            telephone: credentials.telephone as string,
            code: credentials.code as string,
          },
          include: {
            boutique: {
              select: { id: true, nom: true }
            }
          }
        })

        if (!employe) return null

        return {
          id: employe.id,
          name: `${employe.prenom || ""} ${employe.nom}`.trim(),
          telephone: employe.telephone,
          role: "EMPLOYE",
          boutiqueId: employe.boutique?.id,
          boutiqueNom: employe.boutique?.nom,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || "EMPLOYE"
        token.id = user.id || ""
        token.boutiqueId = (user as any).boutiqueId || null
        token.boutiqueNom = (user as any).boutiqueNom || null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
          ; (session.user as any).boutiqueId = token.boutiqueId
          ; (session.user as any).boutiqueNom = token.boutiqueNom
      }
      return session
    }
  }
}