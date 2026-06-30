// components/shared/redirect-if-logged-in.tsx
"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function RedirectIfLoggedIn() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = (session.user as any).role
      if (role === "ADMIN") {
        router.replace("/admin")
      } else if (role === "EMPLOYE") {
        router.replace("/employe")
      } else {
        router.replace("/commercant")
      }
    }
  }, [session, status, router])

  return null
}
