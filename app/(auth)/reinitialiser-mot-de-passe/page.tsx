// src/app/(auth)/reinitialiser-mot-de-passe/page.tsx
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Lock, Key, Loader2, Store, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

function FormulaireReinitialisation() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")

    const [nouveauMotDePasse, setNouveauMotDePasse] = useState("")
    const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("")
    const [chargement, setChargement] = useState(false)
    const [succes, setSucces] = useState(false)

    // Redirection automatique en cas de succès
    useEffect(() => {
        if (succes) {
            const timer = setTimeout(() => {
                router.push("/connexion")
            }, 4000)
            return () => clearTimeout(timer)
        }
    }, [succes, router])

    if (!token) {
        return (
            <div className="text-center">
                <div className="inline-flex bg-red-100 p-3 rounded-full text-red-600 mb-4">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h3>
                <p className="text-gray-600 mb-6">Le jeton de réinitialisation est manquant. Veuillez effectuer une nouvelle demande.</p>
                <Link href="/connexion">
                    <Button className="w-full h-11 bg-blue-600 hover:bg-blue-500">
                        Retour à la connexion
                    </Button>
                </Link>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (nouveauMotDePasse.length < 8) {
            toast.error("Le mot de passe doit faire au moins 8 caractères.")
            return
        }

        if (nouveauMotDePasse !== confirmationMotDePasse) {
            toast.error("Les mots de passe ne correspondent pas.")
            return
        }

        setChargement(true)

        try {
            const reponse = await fetch("/api/auth/reset-password/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    nouveauMotDePasse,
                    confirmationMotDePasse,
                }),
            })

            const data = await reponse.json()

            if (reponse.ok) {
                toast.success("Mot de passe modifié avec succès !")
                setSucces(true)
            } else {
                toast.error(data.erreur || "Une erreur est survenue")
            }
        } catch {
            toast.error("Erreur de connexion avec le serveur")
        } finally {
            setChargement(false)
        }
    }

    if (succes) {
        return (
            <div className="text-center">
                <div className="inline-flex bg-green-100 p-3 rounded-full text-green-600 mb-4 animate-bounce">
                    <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Mot de passe réinitialisé !</h3>
                <p className="text-gray-600 mb-6">Votre mot de passe a bien été modifié. Vous allez être redirigé vers la page de connexion dans quelques instants...</p>
                <Link href="/connexion">
                    <Button className="w-full h-11 bg-green-600 hover:bg-green-500">
                        Se connecter maintenant
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="nouveauMotDePasse">Nouveau mot de passe</Label>
                <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        id="nouveauMotDePasse"
                        type="password"
                        required
                        value={nouveauMotDePasse}
                        onChange={(e) => setNouveauMotDePasse(e.target.value)}
                        placeholder="Au moins 8 caractères"
                        className="pl-10 h-11"
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="confirmationMotDePasse">Confirmer le nouveau mot de passe</Label>
                <div className="relative mt-1.5">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        id="confirmationMotDePasse"
                        type="password"
                        required
                        value={confirmationMotDePasse}
                        onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        className="pl-10 h-11"
                    />
                </div>
            </div>

            <Button type="submit" className="w-full h-11 mt-2 bg-blue-600 hover:bg-blue-500" disabled={chargement}>
                {chargement ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Modifier mon mot de passe
            </Button>
        </form>
    )
}

export default function PageReinitialisation() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex bg-white p-4 rounded-2xl shadow-lg mb-4">
                        <Store className="h-10 w-10 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Nouveau mot de passe</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Choisissez un nouveau mot de passe sécurisé pour votre compte.
                    </p>
                </div>

                <div className="bg-white py-8 px-8 shadow-xl rounded-2xl">
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center py-6">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                            <p className="text-sm text-gray-500">Chargement...</p>
                        </div>
                    }>
                        <FormulaireReinitialisation />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}
