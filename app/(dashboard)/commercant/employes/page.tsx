// src/app/(dashboard)/commercant/employes/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { GestionEmployes } from "@/components/employes/gestion-employes"

export default async function PageEmployes() {
  const session = await auth()

  if (!session?.user) {
    redirect("/connexion")
  }

  const [employes, boutiques] = await Promise.all([
    prisma.employe.findMany({
      where: {
        boutique: {
          commercantId: session.user.id
        }
      },
      include: {
        boutique: {
          select: { id: true, nom: true }
        }
      },
      orderBy: { dateCreation: 'desc' }
    }),
    prisma.boutique.findMany({
      where: { commercantId: session.user.id },
      select: { id: true, nom: true }
    })
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Employés</h1>
        <p className="text-gray-500 mt-1">Gérez vos employés et leurs accès</p>
      </div>
      <GestionEmployes employes={employes} boutiques={boutiques} />
    </div>
  )
}