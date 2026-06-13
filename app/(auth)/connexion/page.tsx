// src/app/(auth)/connexion/page.tsx
import { FormulaireConnexion } from "@/components/formulaires/formulaire-connexion"
import Link from "next/link"
import { Store } from "lucide-react"

export default function PageConnexion() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex bg-white p-3 sm:p-4 rounded-2xl shadow-lg mb-4">
                        <Store className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Connexion</h2>
                    <p className="mt-2 text-sm sm:text-base text-gray-600">
                        <Link href="/inscription" className="font-medium text-blue-600 hover:text-blue-500">
                            Créer un compte commerçant
                        </Link>
                    </p>
                </div>

                <div className="bg-white py-6 sm:py-8 px-4 sm:px-8 shadow-xl rounded-2xl">
                    <FormulaireConnexion />
                </div>
            </div>
        </div>
    )
}