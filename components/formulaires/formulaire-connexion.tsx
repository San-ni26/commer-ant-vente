// src/components/formulaires/formulaire-connexion.tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
    Mail, Lock, Phone, Key, Loader2, User, Building2
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog"

export function FormulaireConnexion() {
    const [mode, setMode] = useState<"commercant" | "employe">("commercant")
    const [chargement, setChargement] = useState(false)

    // Commerçant
    const [email, setEmail] = useState("")
    const [motDePasse, setMotDePasse] = useState("")

    // Réinitialisation de mot de passe
    const [openReset, setOpenReset] = useState(false)
    const [emailReset, setEmailReset] = useState("")
    const [chargementReset, setChargementReset] = useState(false)

    const handleDemandeReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setChargementReset(true)

        try {
            const reponse = await fetch("/api/auth/reset-password/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailReset }),
            })

            const data = await reponse.json()

            if (reponse.ok) {
                toast.success(data.message || "Lien de réinitialisation envoyé !")
                setOpenReset(false)
                setEmailReset("")
            } else {
                toast.error(data.erreur || "Une erreur est survenue")
            }
        } catch {
            toast.error("Erreur de connexion avec le serveur")
        } finally {
            setChargementReset(false)
        }
    }

    // Employé
    const [telephone, setTelephone] = useState("")
    const [code, setCode] = useState("")

    const handleSubmitCommercant = async (e: React.FormEvent) => {
        e.preventDefault()
        setChargement(true)

        try {
            const resultat = await signIn("commercant", {
                email,
                motDePasse,
                typeConnexion: "commercant",
                redirect: false,
            })

            if (resultat?.error) {
                toast.error("Email ou mot de passe incorrect")
            } else if (resultat?.ok) {
                toast.success("Connexion réussie !")
                window.location.href = "/commercant"
            }
        } catch {
            toast.error("Erreur de connexion")
        } finally {
            setChargement(false)
        }
    }

    const handleSubmitEmploye = async (e: React.FormEvent) => {
        e.preventDefault()
        setChargement(true)

        try {
            const resultat = await signIn("employe", {
                telephone,
                code,
                typeConnexion: "employe",
                redirect: false,
            })

            if (resultat?.error) {
                toast.error("Numéro ou code incorrect")
            } else if (resultat?.ok) {
                toast.success("Connexion réussie !")
                window.location.href = "/employe"
            }
        } catch {
            toast.error("Erreur de connexion")
        } finally {
            setChargement(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Sélecteur de mode */}
            <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                    onClick={() => setMode("commercant")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${mode === "commercant"
                            ? "bg-white shadow text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    <Building2 className="h-4 w-4" />
                    Commerçant
                </button>
                <button
                    onClick={() => setMode("employe")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${mode === "employe"
                            ? "bg-white shadow text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    <User className="h-4 w-4" />
                    Employé
                </button>
            </div>

            {/* Formulaire Commerçant */}
            {mode === "commercant" && (
                <form onSubmit={handleSubmitCommercant} className="space-y-4">
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <div className="relative mt-1.5">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="exemple@email.com"
                                className="pl-10 h-11"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="motDePasse">Mot de passe</Label>
                            
                            <Dialog open={openReset} onOpenChange={setOpenReset}>
                                <DialogTrigger asChild>
                                    <button
                                        type="button"
                                        className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline transition-colors focus:outline-none cursor-pointer"
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Mot de passe oublié</DialogTitle>
                                        <DialogDescription>
                                            Saisissez votre adresse e-mail. Si elle est enregistrée, vous recevrez un lien de réinitialisation.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleDemandeReset} className="space-y-4 pt-4">
                                        <div>
                                            <Label htmlFor="emailReset">Adresse e-mail</Label>
                                            <div className="relative mt-1.5">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="emailReset"
                                                    type="email"
                                                    required
                                                    value={emailReset}
                                                    onChange={(e) => setEmailReset(e.target.value)}
                                                    placeholder="exemple@email.com"
                                                    className="pl-10 h-11"
                                                />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full h-11" disabled={chargementReset}>
                                            {chargementReset ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Envoyer le lien de réinitialisation
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="relative mt-1.5">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="motDePasse"
                                type="password"
                                required
                                value={motDePasse}
                                onChange={(e) => setMotDePasse(e.target.value)}
                                placeholder="Votre mot de passe"
                                className="pl-10 h-11"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-11" disabled={chargement}>
                        {chargement ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Se connecter
                    </Button>
                </form>
            )}

            {/* Formulaire Employé */}
            {mode === "employe" && (
                <form onSubmit={handleSubmitEmploye} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-2">
                        <p className="font-medium mb-1">🔐 Connexion employé</p>
                        <p>Utilisez votre numéro de téléphone et votre code à 4 chiffres fourni par votre responsable.</p>
                    </div>

                    <div>
                        <Label htmlFor="telephone">Numéro de téléphone</Label>
                        <div className="relative mt-1.5">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="telephone"
                                type="tel"
                                required
                                value={telephone}
                                onChange={(e) => setTelephone(e.target.value)}
                                placeholder="0612345678"
                                className="pl-10 h-11"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="code">Code d'accès (4 chiffres)</Label>
                        <div className="relative mt-1.5">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                pattern="[0-9]{4}"
                                required
                                value={code}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 4)
                                    setCode(val)
                                }}
                                placeholder="••••"
                                className="pl-10 h-11 text-center text-2xl tracking-widest font-mono"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-11" disabled={chargement}>
                        {chargement ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Accéder à mon espace
                    </Button>
                </form>
            )}
        </div>
    )
}