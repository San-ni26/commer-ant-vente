// src/components/formulaires/formulaire-inscription.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function FormulaireInscription() {
    const router = useRouter()
    const [chargement, setChargement] = useState(false)
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

        // Validation côté client
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
            console.log("Envoi des données:", donnees)

            const reponse = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(donnees),
            })

            const resultat = await reponse.json()
            console.log("Réponse:", resultat)

            if (reponse.ok) {
                toast.success("Compte créé avec succès !")

                // Afficher le lien de vérification dans la console pour le développement
                if (resultat.lienVerification) {
                    console.log("Lien de vérification:", resultat.lienVerification)
                    toast.info("Lien de vérification affiché dans la console")
                }

                router.push("/verification-email")
            } else {
                toast.error(resultat.erreur || "Erreur lors de l'inscription")

                // Afficher les détails des erreurs de validation
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
                <Input
                    id="motDePasse"
                    type="password"
                    required
                    minLength={8}
                    value={donnees.motDePasse}
                    onChange={(e) => setDonnees({ ...donnees, motDePasse: e.target.value })}
                    placeholder="Minimum 8 caractères"
                />
            </div>

            <div>
                <Label htmlFor="confirmation">Confirmer le mot de passe *</Label>
                <Input
                    id="confirmation"
                    type="password"
                    required
                    minLength={8}
                    value={donnees.confirmationMotDePasse}
                    onChange={(e) => setDonnees({ ...donnees, confirmationMotDePasse: e.target.value })}
                    placeholder="Répétez votre mot de passe"
                />
            </div>

            <Button type="submit" className="w-full" disabled={chargement}>
                {chargement ? "Création du compte..." : "Créer mon compte"}
            </Button>
        </form>
    )
}