import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Prevent the browser-only `idb` package from being traced into the
  // server bundle — root cause of the Turbopack
  // "chunk.reason.enqueueModel is not a function" RSC error.
  serverExternalPackages: ['idb'],


  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  async headers() {
    return [
      // Images publiques → 30 jours
      {
        source: "/:path*.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      {
        source: "/:path*.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      // Favicon → 7 jours
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
      // Service Worker → jamais mis en cache
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      // Manifest PWA → 1 jour
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      // API de lecture → cache privé 30s côté client, revalidation silencieuse
      // Les données personnelles ne doivent pas être partagées entre utilisateurs (private)
      {
        source: "/api/boutiques",
        headers: [{ key: "Cache-Control", value: "private, max-age=30, stale-while-revalidate=60" }],
      },
      {
        source: "/api/boutiques/:id/ventes",
        headers: [{ key: "Cache-Control", value: "private, max-age=20, stale-while-revalidate=40" }],
      },
      {
        source: "/api/boutiques/:id/transactions",
        headers: [{ key: "Cache-Control", value: "private, max-age=20, stale-while-revalidate=40" }],
      },
      {
        source: "/api/boutiques/:id/details",
        headers: [{ key: "Cache-Control", value: "private, max-age=60, stale-while-revalidate=120" }],
      },
      {
        source: "/api/dashboard/stats",
        headers: [{ key: "Cache-Control", value: "private, max-age=30, stale-while-revalidate=60" }],
      },
      {
        source: "/api/employes",
        headers: [{ key: "Cache-Control", value: "private, max-age=60, stale-while-revalidate=120" }],
      },
      {
        source: "/api/rapports",
        headers: [{ key: "Cache-Control", value: "private, max-age=60, stale-while-revalidate=120" }],
      },
      // Health check → pas de cache
      {
        source: "/api/health",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      // Pages HTML → Stale-While-Revalidate (affiche vite, revalide en arrière-plan)
      {
        source: "/((?!api|_next).*)",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=86400, stale-while-revalidate=59" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
}

export default nextConfig
