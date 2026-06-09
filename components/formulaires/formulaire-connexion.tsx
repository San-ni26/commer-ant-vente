// src/components/formulaires/formulaire-connexion.tsx - Version simplifiée
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Mail, Lock, Loader2 } from "lucide-react"

export function FormulaireConnexion() {
    const [chargement, setChargement] = useState(false)
    const [donnees, setDonnees] = useState({
        email: "",
        motDePasse: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setChargement(true)

        try {
            // Essayer d'abord de se connecter sans redirect
            const resultat = await signIn("credentials", {
                email: donnees.email,
                motDePasse: donnees.motDePasse,
                redirect: false,
            })

            if (resultat?.error) {
                toast.error("Email ou mot de passe incorrect")
                setChargement(false)
                return
            }

            // Récupérer la session
            const sessionRes = await fetch("/api/auth/session")
            const session = await sessionRes.json()

            toast.success("Connexion réussie !")

            // Rediriger avec window.location pour un reload complet
            const role = session?.user?.role
            if (role === "ADMIN") {
                window.location.href = "/admin"
            } else if (role === "COMMERCANT") {
                window.location.href = "/commercant"
            } else {
                window.location.href = "/commercant"
            }
        } catch (erreur) {
            console.error("Erreur:", erreur)
            toast.error("Erreur lors de la connexion")
            setChargement(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        id="email"
                        type="email"
                        required
                        value={donnees.email}
                        onChange={(e) => setDonnees({ ...donnees, email: e.target.value })}
                        className="pl-10"
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="motDePasse">Mot de passe</Label>
                <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        id="motDePasse"
                        type="password"
                        required
                        value={donnees.motDePasse}
                        onChange={(e) => setDonnees({ ...donnees, motDePasse: e.target.value })}
                        className="pl-10"
                    />
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={chargement}>
                {chargement ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Se connecter
            </Button>
        </form>
    )
}