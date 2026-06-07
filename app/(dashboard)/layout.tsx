// src/app/(dashboard)/layout.tsx
import { BarreLaterale } from "@/components/shared/barre-laterale"
import { EnTete } from "@/components/shared/en-tete"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/connexion")
  }

  return (
    <div className="min-h-screen flex">
      <BarreLaterale />
      <div className="flex-1 flex flex-col">
        <EnTete />
        <main className="flex-1 bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}