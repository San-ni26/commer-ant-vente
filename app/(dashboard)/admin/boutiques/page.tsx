// app/(dashboard)/admin/boutiques/page.tsx
// Shell statique — données chargées côté client avec gestion admin offline compatible
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminBoutiquesClient } from "@/components/admin/admin-boutiques-client"

export default async function PageAdminBoutiques() {
  const session = await auth()

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/connexion")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Boutiques</h1>
        <p className="text-gray-500 mt-1">Toutes les boutiques de la plateforme (Administration)</p>
      </div>
      <AdminBoutiquesClient />
    </div>
  )
}