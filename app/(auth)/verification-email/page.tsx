// src/app/(auth)/verification-email/page.tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mail, XCircle, AlertTriangle } from "lucide-react"

interface PageProps {
    searchParams: Promise<{ erreur?: string }>
}

export default async function PageVerificationEmail({ searchParams }: PageProps) {
    const { erreur } = await searchParams

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                {erreur === "token_invalide" ? (
                    <>
                        <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Lien invalide
                        </h1>
                        <p className="text-gray-600 mb-4">
                            Ce lien de vérification n'est pas valide ou a déjà été utilisé.
                        </p>
                    </>
                ) : erreur === "token_expire" ? (
                    <>
                        <AlertTriangle className="h-20 w-20 text-orange-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Lien expiré
                        </h1>
                        <p className="text-gray-600 mb-4">
                            Le lien de vérification a expiré (valable 24h).
                        </p>
                    </>
                ) : (
                    <>
                        <Mail className="h-20 w-20 text-blue-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Vérifiez votre boîte mail
                        </h1>
                        <p className="text-gray-600 mb-4">
                            Nous vous avons envoyé un email de vérification.
                            Cliquez sur le lien dans l'email pour activer votre compte.
                        </p>
                        <p className="text-sm text-gray-500 mb-8">
                            Vérifiez aussi vos spams si vous ne trouvez pas l'email.
                        </p>
                    </>
                )}
                <Link href="/connexion">
                    <Button variant="outline" className="w-full sm:w-auto">
                        Aller à la connexion
                    </Button>
                </Link>
            </div>
        </div>
    )
}