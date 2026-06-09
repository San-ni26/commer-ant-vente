// src/app/(auth)/verification-succes/page.tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function PageVerificationSucces() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Email vérifié !
                </h1>
                <p className="text-gray-600 mb-8">
                    Votre adresse email a été vérifiée avec succès.
                    Vous pouvez maintenant vous connecter à votre compte.
                </p>
                <Link href="/connexion">
                    <Button size="lg" className="w-full sm:w-auto">
                        Se connecter
                    </Button>
                </Link>
            </div>
        </div>
    )
}