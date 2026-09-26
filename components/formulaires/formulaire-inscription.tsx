// src/components/formulaires/formulaire-inscription.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export function FormulaireInscription() {
    const router = useRouter()
    const [chargement, setChargement] = useState(false)
    const [afficherMotDePasse, setAfficherMotDePasse] = useState(false)
    const [afficherConfirmation, setAfficherConfirmation] = useState(false)
    const [donnees, setDonnees] = useState({
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        nomBoutique: "",
        motDePasse: "",
        confirmationMotDePasse: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (donnees.motDePasse !== donnees.confirmationMotDePasse) {
            toast.error("Les mots de passe ne correspondent pas")
            return
        }

        if (donnees.motDePasse.length < 8) {
            toast.error("Le mot de passe doit contenir au moins 8 caractères")
            return
        }

        if (donnees.telephone.length < 10) {
            toast.error("Numéro de téléphone invalide")
            return
        }

        setChargement(true)

        try {
            const reponse = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(donnees),
            })

            const resultat = await reponse.json()

            if (reponse.ok) {
                toast.success("Compte créé avec succès !")
                router.push("/connexion")
            } else {
                toast.error(resultat.erreur || "Erreur lors de l'inscription")
                if (resultat.details) {
                    resultat.details.forEach((detail: any) => {
                        toast.error(`${detail.champ}: ${detail.message}`)
                    })
                }
            }
        } catch (erreur) {
            console.error("Erreur:", erreur)
            toast.error("Erreur de connexion au serveur")
        } finally {
            setChargement(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                        id="nom"
                        required
                        minLength={2}
                        value={donnees.nom}
                        onChange={(e) => setDonnees({ ...donnees, nom: e.target.value })}
                        placeholder="Dupont"
                    />
                </div>
                <div>
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                        id="prenom"
                        value={donnees.prenom}
                        onChange={(e) => setDonnees({ ...donnees, prenom: e.target.value })}
                        placeholder="Jean"
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                    id="email"
                    type="email"
                    required
                    value={donnees.email}
                    onChange={(e) => setDonnees({ ...donnees, email: e.target.value })}
                    placeholder="jean.dupont@email.com"
                />
            </div>

            <div>
                <Label htmlFor="telephone">Téléphone *</Label>
                <Input
                    id="telephone"
                    type="tel"
                    required
                    minLength={10}
                    value={donnees.telephone}
                    onChange={(e) => setDonnees({ ...donnees, telephone: e.target.value })}
                    placeholder="0612345678"
                />
            </div>

            <div>
                <Label htmlFor="nomBoutique">Nom de la boutique *</Label>
                <Input
                    id="nomBoutique"
                    required
                    minLength={2}
                    value={donnees.nomBoutique}
                    onChange={(e) => setDonnees({ ...donnees, nomBoutique: e.target.value })}
                    placeholder="Ma Boutique"
                />
            </div>

            <div>
                <Label htmlFor="motDePasse">Mot de passe *</Label>
                <div className="relative mt-1.5">
                    <Input
                        id="motDePasse"
                        type={afficherMotDePasse ? "text" : "password"}
                        required
                        minLength={8}
                        value={donnees.motDePasse}
                        onChange={(e) => setDonnees({ ...donnees, motDePasse: e.target.value })}
                        placeholder="Minimum 8 caractères"
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setAfficherMotDePasse(!afficherMotDePasse)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        aria-label={afficherMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                        {afficherMotDePasse ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div>
                <Label htmlFor="confirmation">Confirmer le mot de passe *</Label>
                <div className="relative mt-1.5">
                    <Input
                        id="confirmation"
                        type={afficherConfirmation ? "text" : "password"}
                        required
                        minLength={8}
                        value={donnees.confirmationMotDePasse}
                        onChange={(e) => setDonnees({ ...donnees, confirmationMotDePasse: e.target.value })}
                        placeholder="Répétez votre mot de passe"
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setAfficherConfirmation(!afficherConfirmation)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        aria-label={afficherConfirmation ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                        {afficherConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={chargement}>
                {chargement ? "Création du compte..." : "Créer mon compte"}
            </Button>
        </form>
    )
}
