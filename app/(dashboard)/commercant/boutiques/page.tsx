// src/app/(dashboard)/commercant/boutiques/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { GestionBoutiques } from "@/components/boutiques/gestion-boutiques"

export default async function PageBoutiques() {
  const session = await auth()

  if (!session?.user) {
    redirect("/connexion")
  }

  const boutiques = await prisma.boutique.findMany({
    where: { commercantId: session.user.id },
    include: {
      _count: { select: { ventes: true, employes: true } },
      gerant: { select: { nom: true, prenom: true } }
    },
    orderBy: { dateCreation: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Mes Boutiques</h1>
        <p className="text-gray-500 mt-1">Gérez vos boutiques</p>
      </div>
      <GestionBoutiques boutiques={boutiques} />
    </div>
  )
}