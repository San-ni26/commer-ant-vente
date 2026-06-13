// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      boutiqueId?: string
      boutiqueNom?: string
      telephone?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    boutiqueId?: string
    boutiqueNom?: string
    telephone?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    role: string
    boutiqueId?: string
    boutiqueNom?: string
    telephone?: string
  }
}