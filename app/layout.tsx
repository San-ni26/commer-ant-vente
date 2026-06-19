// app/layout.tsx
import type { Metadata, Viewport } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { AuthProvider } from "@/components/providers/auth-provider"
import { PWARegister } from "@/components/shared/pwa-register"

// Seulement les poids réellement utilisés (au lieu de 100→900)
// Réduit le bundle font d'environ 60%
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
  preload: true,
})

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: {
    default: "Commerce Vente - Gestion Commerciale",
    template: "%s | Commerce Vente",
  },
  description: "Digitalisez votre commerce en toute simplicité",
  metadataBase: new URL(
    process.env.NEXTAUTH_URL || "http://localhost:3000"
  ),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Commerce Vente",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={poppins.variable}>
      <head>
        {/* Préconnexion Google Fonts pour réduire la latence */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={poppins.className}>
        <AuthProvider>
          <PWARegister />
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}