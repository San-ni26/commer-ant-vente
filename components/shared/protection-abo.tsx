// src/components/shared/protection-abo.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { peutAccederBoutique } from "@/lib/abonnement"

interface PropsProtectionAbo {
    children: React.ReactNode
    boutiqueId: string
}

export async function ProtectionAbonnement({ children, boutiqueId }: PropsProtectionAbo) {
    const session = await auth()

    if (!session?.user) {
        redirect("/connexion")
    }

    // L'admin a toujours accès
    if ((session.user as any).role === "ADMIN") {
        return <>{children}</>
    }

    const { autorise } = await peutAccederBoutique(boutiqueId)

    if (!autorise) {
        redirect("/abonnement?expire=1")
    }

    return <>{children}</>
}