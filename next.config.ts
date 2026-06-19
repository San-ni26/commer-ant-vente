import type { NextConfig } from "next"

const isProd = process.env.NODE_ENV === "production"

const nextConfig: NextConfig = {
  // Compression gzip activée (déjà par défaut, explicite pour la clarté)
  compress: true,

  // Supprime l'en-tête X-Powered-By (sécurité + légèreté)
  poweredByHeader: false,

  // Génère les ETags pour la validation conditionnelle du cache
  generateEtags: true,

  // Optimisation des images Next.js
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
  },

  // En-têtes HTTP personnalisés
  async headers() {
    return [
      // Images publiques → 30 jours
      {
        source: "/:path*.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      // Favicon → 7 jours
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800",
          },
        ],
      },
      // Service Worker → toujours revalidé (jamais mis en cache)
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      // Manifest PWA → 1 jour
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      // Pages HTML → Stale-While-Revalidate (affiche vite, revalide en arrière-plan)
      {
        source: "/((?!api|_next).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=59",
          },
          // Sécurité
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ]
  },
}

export default nextConfig
