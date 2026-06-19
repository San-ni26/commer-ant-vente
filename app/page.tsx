// app/page.tsx
// Page entièrement statique — l'auth check est géré par le middleware Edge
import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, Users, TrendingUp, Shield, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Commerce Vente — Digitalisez votre commerce",
  description:
    "Gérez vos ventes, boutiques et employés depuis une seule plateforme. Suivez votre activité en temps réel.",
  openGraph: {
    title: "Commerce Vente — Digitalisez votre commerce",
    description:
      "Gérez vos ventes, boutiques et employés depuis une seule plateforme.",
    type: "website",
  },
}

// Statique : pas de revalidation, rendu une fois au build
export const revalidate = false
export const dynamic = "force-static"

export default function PageAccueil() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-between">
      <div>
        {/* En-tête */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Store className="h-8 w-8 text-blue-600" aria-hidden="true" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Commerce Vente</h1>
            </div>
            <div className="flex gap-2 sm:gap-4 w-full sm:w-auto justify-center">
              <Link href="/connexion" className="flex-1 sm:flex-initial">
                <Button variant="outline" className="w-full">Se connecter</Button>
              </Link>
              <Link href="/inscription" className="flex-1 sm:flex-initial">
                <Button className="w-full">Créer un compte</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Section Héro */}
        <section className="container mx-auto px-4 py-12 sm:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              Digitalisez votre commerce en toute simplicité
            </h2>
            <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8">
              Gérez vos ventes, boutiques et employés depuis une seule plateforme.
              Suivez votre activité en temps réel et optimisez votre gestion commerciale.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link href="/inscription" className="w-full sm:w-auto">
                <Button size="lg" className="w-full text-base sm:text-lg px-6 sm:px-8">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/connexion" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full text-base sm:text-lg px-6 sm:px-8">
                  Démo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section className="container mx-auto px-4 py-12 sm:py-16" aria-labelledby="features-title">
          <h2 id="features-title" className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            Tout ce dont vous avez besoin pour gérer votre commerce
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Store className="h-12 w-12 text-blue-600 mx-auto mb-4" aria-hidden="true" />
                <CardTitle>Gestion des Boutiques</CardTitle>
                <CardDescription>Créez et gérez plusieurs boutiques facilement</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 text-green-600 mx-auto mb-4" aria-hidden="true" />
                <CardTitle>Gestion des Employés</CardTitle>
                <CardDescription>Assignez des employés avec des codes d&apos;accès uniques</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" aria-hidden="true" />
                <CardTitle>Suivi en Temps Réel</CardTitle>
                <CardDescription>Visualisez vos ventes et transactions en direct</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" aria-hidden="true" />
                <CardTitle>Sécurisé</CardTitle>
                <CardDescription>Vos données sont protégées et chiffrées</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="bg-white py-12 sm:py-16" aria-labelledby="how-title">
          <div className="container mx-auto px-4">
            <h2 id="how-title" className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
              Comment ça marche&nbsp;?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Créez votre compte</h3>
                <p className="text-gray-600">Inscrivez-vous en quelques minutes et vérifiez votre email</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Configurez vos boutiques</h3>
                <p className="text-gray-600">Ajoutez vos boutiques et assignez vos employés</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Suivez votre activité</h3>
                <p className="text-gray-600">Visualisez vos ventes et gérez vos finances en temps réel</p>
              </div>
            </div>
          </div>
        </section>

        {/* Appel à l'action */}
        <section className="container mx-auto px-4 py-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Prêt à digitaliser votre commerce&nbsp;?
          </h2>
          <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8">
            Rejoignez des centaines de commerçants qui nous font confiance
          </p>
          <Link href="/inscription" className="w-full sm:w-auto inline-block">
            <Button size="lg" className="w-full text-base sm:text-lg px-6 sm:px-12">
              Créer mon compte gratuitement
            </Button>
          </Link>
        </section>
      </div>

      {/* Pied de page */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Commerce Vente. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}