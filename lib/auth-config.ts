// src/lib/auth-config.ts
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schemaConnexion = z.object({
  email: z.string().email("Email invalide"),
  motDePasse: z.string().min(6, "Mot de passe trop court")
})

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
      name: "credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email",
          placeholder: "exemple@email.com"
        },
        motDePasse: { 
          label: "Mot de passe", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.motDePasse) {
            return null
          }

          const { email, motDePasse } = schemaConnexion.parse(credentials)

          const utilisateur = await prisma.utilisateur.findUnique({
            where: { email }
          })

          if (!utilisateur || !utilisateur.emailVerifie) {
            return null
          }

          const motDePasseValide = await bcrypt.compare(
            motDePasse,
            utilisateur.motDePasse
          )

          if (!motDePasseValide) {
            return null
          }

          // Retourner l'utilisateur avec le rôle
          return {
            id: utilisateur.id,
            email: utilisateur.email,
            name: utilisateur.nom,
            role: utilisateur.role,
          }
        } catch (error) {
          console.error("Erreur d'authentification:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role ?? "COMMERCANT"  // Valeur par défaut
        token.id = user.id ?? ""  // Garantir que ce n'est pas undefined
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as string) ?? "COMMERCANT"
        session.user.id = (token.id as string) ?? ""
      }
      return session
    }
  }
}