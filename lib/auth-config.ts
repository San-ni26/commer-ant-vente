// src/lib/auth-config.ts
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma, avecRetry } from "./prisma"
import bcrypt from "bcryptjs"

export const authConfig: NextAuthConfig = {
  // L'adapter est NÉCESSAIRE pour que auth() côté serveur puisse hydrater la session
  // Sans lui, auth() retourne null même avec un JWT valide
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
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

        // avecRetry gère les timeouts de connexion DB transitoires
        const utilisateur = await avecRetry(() =>
          prisma.utilisateur.findUnique({
            where: { email: credentials.email as string }
          })
        )

        if (!utilisateur) return null

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

        const employe = await avecRetry(() =>
          prisma.employe.findFirst({
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
        )

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
    async jwt({ token, user, trigger }) {
      console.log("[jwt callback]", { 
        trigger, 
        hasUser: !!user, 
        tokenSub: token.sub,
        tokenRole: token.role 
      })

      // Au login (user existe), on enrichit le token avec TOUTES les données
      if (user) {
        token.role = user.role || "EMPLOYE"
        token.id = user.id || ""
        token.email = user.email || ""
        token.name = user.name || ""
        token.boutiqueId = (user as any).boutiqueId || null
        token.boutiqueNom = (user as any).boutiqueNom || null
        console.log("[jwt callback] Token enrichi avec user data:", {
          id: token.id,
          email: token.email,
          role: token.role
        })
      }
      return token
    },
    async session({ session, token }) {
      console.log("[session callback]", { 
        hasSession: !!session, 
        hasToken: !!token,
        tokenRole: token.role,
        tokenEmail: token.email,
        sessionUserBefore: session.user?.email
      })

      // Reconstruire session.user depuis le token (qui contient tout)
      if (token && session) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          role: token.role as string,
          ...(token.boutiqueId ? {
            boutiqueId: token.boutiqueId as string,
            boutiqueNom: token.boutiqueNom as string,
          } : {})
        } as any
      }

      console.log("[session callback] Session finale:", {
        email: session.user?.email,
        role: (session.user as any)?.role
      })

      return session
    }
  }
}