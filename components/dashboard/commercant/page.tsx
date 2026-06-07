// src/app/(dashboard)/commercant/page.tsx
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { TableauDeBordCommercant } from "@/components/dashboard/tableau-de-bord-commercant"
import { redirect } from "next/navigation"

export default async function PageTableauDeBordCommercant() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/connexion")
  }

  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  
  const demain = new Date(aujourdhui)
  demain.setDate(demain.getDate() + 1)

  const [nombreBoutiques, ventesDuJour, totalVentes, soldeTotal] = await Promise.all([
    prisma.boutique.count({
      where: { commercantId: session.user.id }
    }),
    prisma.vente.aggregate({
      where: {
        boutique: {
          commercantId: session.user.id
        },
        dateVente: {
          gte: aujourdhui,
          lt: demain
        }
      },
      _sum: {
        montant: true
      }
    }),
    prisma.vente.aggregate({
      where: {
        boutique: {
          commercantId: session.user.id
        }
      },
      _sum: {
        montant: true
      }
    }),
    prisma.boutique.aggregate({
      where: {
        commercantId: session.user.id
      },
      _sum: {
        solde: true
      }
    })
  ])

  const statistiques = {
    nombreBoutiques,
    ventesDuJour: ventesDuJour._sum.montant || 0,
    totalVentes: totalVentes._sum.montant || 0,
    soldeTotal: soldeTotal._sum.solde || 0,
  }

  return <TableauDeBordCommercant statistiques={statistiques} />
}