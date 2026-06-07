// src/app/(dashboard)/commercant/boutiques/[id]/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DetailsBoutique } from "@/components/boutiques/details-boutique"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PageDetailsBoutique({ params }: PageProps) {
  const session = await auth()
  
  if (!session) {
    redirect("/connexion")
  }

  const { id } = await params

  return (
    <div className="space-y-6">
      <DetailsBoutique boutiqueId={id} />
    </div>
  )
}