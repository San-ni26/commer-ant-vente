// app/(dashboard)/commercant/boutiques/[id]/page.tsx
// Shell statique — données chargées côté client avec fallback offline
import { BoutiqueDetailClient } from "@/components/boutiques/boutique-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PageDetailsBoutique({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <BoutiqueDetailClient boutiqueId={id} />
    </div>
  )
}