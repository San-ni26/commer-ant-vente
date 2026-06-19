// proxy.ts — Next.js 16 : remplace middleware.ts (déprécié en v16)
// Runtime : Node.js (par défaut en v16) → auth() avec Prisma compatible
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const session = await auth()
  const path = request.nextUrl.pathname
  const isLoggedIn = !!session?.user
  const role = (session?.user as any)?.role as string | undefined

  // ── Routes publiques : accès libre sans session
  const routesPubliques = [
    "/connexion",
    "/inscription",
    "/verification-email",
    "/verification-succes",
    "/reinitialiser-mot-de-passe",
    "/api/auth",
    "/api/inscription",
    "/api/verification",
    "/favicon.ico",
  ]

  if (routesPubliques.some((r) => path.startsWith(r))) {
    return NextResponse.next()
  }

  // ── Page d'accueil (/) : redirect vers le bon dashboard si connecté
  if (path === "/") {
    if (!isLoggedIn) return NextResponse.next()

    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    if (role === "EMPLOYE") {
      return NextResponse.redirect(new URL("/employe", request.url))
    }
    // COMMERCANT par défaut
    return NextResponse.redirect(new URL("/commercant", request.url))
  }

  // ── Routes protégées : redirection si pas connecté
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/connexion", request.url))
  }

  // ── Protection des routes /admin (ADMIN uniquement)
  if (path.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/connexion", request.url))
  }

  // ── Protection des routes /commercant
  if (path.startsWith("/commercant")) {
    if (role === "ADMIN") {
      // L'admin redirigé vers son propre dashboard
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    if (role !== "COMMERCANT") {
      return NextResponse.redirect(new URL("/employe", request.url))
    }
  }

  // ── Protection des routes /employe (EMPLOYE uniquement)
  if (path.startsWith("/employe") && role !== "EMPLOYE") {
    return NextResponse.redirect(new URL("/connexion", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Intercepte toutes les routes sauf :
     * - _next/static  (assets JS/CSS bundlés — immutables)
     * - _next/image   (optimisation d'images Next.js)
     * - Fichiers publics statiques (icônes, sw.js, manifest)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest\\.webmanifest|sw\\.js).*)",
  ],
}