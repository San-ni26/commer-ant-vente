// src/components/providers/auth-provider.tsx
"use client"

import { SessionProvider } from "next-auth/react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Désactiver le polling automatique — évite les rechargements en boucle
      // La session est rafraîchie uniquement au focus de la fenêtre
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  )
}