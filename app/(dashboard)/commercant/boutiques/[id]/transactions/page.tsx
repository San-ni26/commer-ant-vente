// src/app/(dashboard)/commercant/boutiques/[id]/transactions/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { FormulaireTransaction } from "@/components/formulaires/formulaire-transaction"
import { ListeTransactions } from "@/components/transactions/liste-transactions"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PageTransactions({ params }: PageProps) {
  const session = await auth()

  if (!session?.user) {
    redirect("/connexion")
  }

  const { id } = await params

  const boutique = await prisma.boutique.findFirst({
    where: { id, commercantId: session.user.id }
  })

  if (!boutique) {
    redirect("/commercant/boutiques")
  }

  const transactions = await prisma.transaction.findMany({
    where: { boutiqueId: id },
    include: {
      verifieePar: {
        select: { nom: true, prenom: true }
      }
    },
    orderBy: { dateTransaction: 'desc' },
    take: 50
  })

  // Statistiques
  const stats = {
    totalVersements: transactions
      .filter(t => t.type === "VERSEMENT" && t.verifiee)
      .reduce((sum, t) => sum + t.montant, 0),
    totalDepenses: transactions
      .filter(t => t.type === "DEPENSE" && t.verifiee)
      .reduce((sum, t) => sum + t.montant, 0),
    enAttente: transactions.filter(t => !t.verifiee).length,
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/commercant/boutiques/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{boutique.nom} - Transactions</h1>
            <p className="text-sm text-gray-500">Versements, dépenses et virements</p>
          </div>
        </div>
        <FormulaireTransaction boutiqueId={id} />
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Versements</p>
            <p className="text-lg sm:text-xl font-bold text-green-600">
              +{stats.totalVersements.toFixed(2)} €
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Dépenses</p>
            <p className="text-lg sm:text-xl font-bold text-red-600">
              -{stats.totalDepenses.toFixed(2)} €
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">En attente</p>
            <p className="text-lg sm:text-xl font-bold text-orange-600">
              {stats.enAttente}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs sm:text-sm text-gray-500">Solde boutique</p>
            <p className="text-lg sm:text-xl font-bold text-blue-600">
              {boutique.solde.toFixed(2)} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ListeTransactions
            transactions={transactions}
            boutiqueId={id}
            estCommercant={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}