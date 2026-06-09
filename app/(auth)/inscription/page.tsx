// src/app/(auth)/inscription/page.tsx
import { FormulaireInscription } from "@/components/formulaires/formulaire-inscription"
import Link from "next/link"
import { Store } from "lucide-react"

export default function PageInscription() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <Store className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
                    Créez votre compte
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Vous avez déjà un compte ?{" "}
                    <Link href="/connexion" className="font-medium text-blue-600 hover:text-blue-500">
                        Connectez-vous
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <FormulaireInscription />
                </div>
            </div>
        </div>
    )
}