// proxy.ts — Next.js 16
// Rôle minimal : laisser passer tout le trafic sans interférer avec l'auth.
// La protection des routes est gérée par le layout server (auth() + redirect).
// Le proxy n'effectue aucune vérification de session pour éviter les race
// conditions post-login (cookie posé par le callback mais pas encore visible
// dans la requête suivante côté proxy).

import { NextRequest, NextResponse } from "next/server"

export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  // Ne s'applique qu'aux routes qui en ont besoin — évite le overhead sur les assets
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|\\.well-known).*)",
  ],
}
