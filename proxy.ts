// src/proxy.ts - CORRIGÉ
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default async function proxy(request: NextRequest) {
  const session = await auth()
  const path = request.nextUrl.pathname

  // Routes publiques
  const routesPubliques = [
    "/connexion",
    "/inscription",
    "/verification-email",
    "/api/auth",
    "/api/inscription",
    "/api/verification"
  ]

  const estRoutePublique = routesPubliques.some(route => path.startsWith(route))

  if (estRoutePublique) {
    return NextResponse.next()
  }

  // Redirection si non connecté
  if (!session?.user) {
    return NextResponse.redirect(new URL("/connexion", request.url))
  }

  // Utiliser l'assertion de type pour le rôle
  const userRole = (session.user as any).role as string

  // Protection des routes admin
  if (path.startsWith("/admin") && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/commercant", request.url))
  }

  // Protection des routes commercant
  if (path.startsWith("/commercant") && userRole !== "COMMERCANT") {
    return NextResponse.redirect(new URL("/employe", request.url))
  }

  // Protection des routes employé
  if (path.startsWith("/employe") && userRole !== "EMPLOYE") {
    return NextResponse.redirect(new URL("/connexion", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/commercant/:path*",
    "/employe/:path*",
    "/api/boutiques/:path*",
    "/api/employes/:path*",
    "/api/transactions/:path*"
  ]
}