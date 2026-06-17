// src/app/layout.tsx
import type { Metadata, Viewport } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { AuthProvider } from "@/components/providers/auth-provider"
import { PWARegister } from "@/components/shared/pwa-register"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-poppins",
})

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: "Commerce Vente - Gestion Commerciale",
  description: "Digitalisez votre commerce en toute simplicité",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Commerce Vente",
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="fr" className={poppins.variable}>
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