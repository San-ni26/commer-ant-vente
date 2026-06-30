// src/app/(dashboard)/commercant/boutiques/[id]/ventes/page.tsx
import { VentesBoutiqueClient } from "@/components/boutiques/ventes-boutique-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PageVentes({ params }: PageProps) {
  const { id } = await params

  return <VentesBoutiqueClient boutiqueId={id} />
}