// src/app/(dashboard)/commercant/boutiques/[id]/transactions/page.tsx
import { TransactionsBoutiqueClient } from "@/components/transactions/transactions-boutique-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PageTransactions({ params }: PageProps) {
  const { id } = await params

  return <TransactionsBoutiqueClient boutiqueId={id} />
}