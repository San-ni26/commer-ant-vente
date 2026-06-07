// src/lib/auth.ts
import NextAuth from "next-auth"
import { authConfig } from "./auth-config"

export const { 
  auth, 
  signIn, 
  signOut, 
  handlers 
} = NextAuth(authConfig)

// Fonction utilitaire pour récupérer la session
export async function getSession() {
  return await auth()
}