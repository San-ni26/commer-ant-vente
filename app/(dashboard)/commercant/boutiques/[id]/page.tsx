import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { DetailsBoutique } from "@/components/boutiques/details-boutique"
import { prisma, avecRetry } from "@/lib/prisma"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PageDetailsBoutique({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/connexion")
  }

  const { id } = await params

  const boutique = await avecRetry(() =>
    prisma.boutique.findFirst({
      where: {
        id: id,
        OR: [
          { commercantId: session.user.id },
          { gerantId: session.user.id }
        ]
      },
      include: {
        gerant: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
          }
        },
        employes: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true,
            code: true,
          }
        },
        _count: {
          select: {
            ventes: true,
            transactions: true,
          }
        }
      }
    })
  )

  if (!boutique) {
    notFound()
  }

  // Adapter types for presentation component (converting prenom from null to string/undefined, Date objects, etc. if needed)
  const boutiqueData = {
    ...boutique,
    gerant: boutique.gerant ? {
      id: boutique.gerant.id,
      nom: boutique.gerant.nom,
      prenom: boutique.gerant.prenom || "",
      email: boutique.gerant.email
    } : undefined,
    employes: boutique.employes.map(e => ({
      id: e.id,
      nom: e.nom,
      prenom: e.prenom || "",
      telephone: e.telephone,
      code: e.code
    }))
  }

  return (
    <div className="space-y-6">
      <DetailsBoutique boutique={boutiqueData} />
    </div>
  )
}