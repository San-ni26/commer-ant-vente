// src/components/shared/protection-route.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"

interface PropsProtectionRoute {
  children: ReactNode
  roles?: Array<"ADMIN" | "COMMERCANT" | "EMPLOYE">
  redirigerVers?: string
}

export async function ProtectionRoute({ 
  children, 
  roles = [], 
  redirigerVers = "/connexion" 
}: PropsProtectionRoute) {
  const session = await auth()
  
  if (!session?.user) {
    redirect(redirigerVers)
  }

  if (roles.length > 0 && !roles.includes(session.user.role as any)) {
    const destinations = {
      ADMIN: "/admin",
      COMMERCANT: "/commercant",
      EMPLOYE: "/employe"
    }
    redirect(destinations[session.user.role as keyof typeof destinations] || redirigerVers)
  }
  
  return <>{children}</>
}