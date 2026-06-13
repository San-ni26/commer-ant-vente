// src/proxy.ts
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
    "/verification-succes",
    "/api/auth",
    "/api/inscription",
    "/api/verification",
    "/favicon.ico",
  ]

  if (routesPubliques.some(r => path.startsWith(r))) {
    return NextResponse.next()
  }

  // Rediriger si pas connecté
  if (!session?.user) {
    return NextResponse.redirect(new URL("/connexion", request.url))
  }

  const role = (session.user as any).role as string

  // Protection des routes admin
  if (path.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/connexion", request.url))
  }

  // Protection des routes commercant
  if (path.startsWith("/commercant") && role !== "COMMERCANT" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/employe", request.url))
  }

  // Protection des routes employé
  if (path.startsWith("/employe") && role !== "EMPLOYE") {
    return NextResponse.redirect(new URL("/connexion", request.url))
  }

  // Rediriger l'admin du /commercant vers /admin
  if (path.startsWith("/commercant") && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url))
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
  ]
}