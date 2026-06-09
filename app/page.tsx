// src/app/page.tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, Users, TrendingUp, Shield, ArrowRight } from "lucide-react"

export default function PageAccueil() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* En-tête */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Commerce Vente</h1>
          </div>
          <div className="flex gap-4">
            <Link href="/connexion">
              <Button variant="outline">Se connecter</Button>
            </Link>
            <Link href="/inscription">
              <Button>Créer un compte</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Section Héro */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Digitalisez votre commerce en toute simplicité
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Gérez vos ventes, boutiques et employés depuis une seule plateforme.
            Suivez votre activité en temps réel et optimisez votre gestion commerciale.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/inscription">
              <Button size="lg" className="text-lg px-8">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/connexion">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Démo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">
          Tout ce dont vous avez besoin pour gérer votre commerce
        </h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Store className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Gestion des Boutiques</CardTitle>
              <CardDescription>
                Créez et gérez plusieurs boutiques facilement
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Gestion des Employés</CardTitle>
              <CardDescription>
                Assignez des employés avec des codes d'accès uniques
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Suivi en Temps Réel</CardTitle>
              <CardDescription>
                Visualisez vos ventes et transactions en direct
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <CardTitle>Sécurisé</CardTitle>
              <CardDescription>
                Vos données sont protégées et chiffrées
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">
            Comment ça marche ?
          </h3>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Créez votre compte</h4>
              <p className="text-gray-600">
                Inscrivez-vous en quelques minutes et vérifiez votre email
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Configurez vos boutiques</h4>
              <p className="text-gray-600">
                Ajoutez vos boutiques et assignez vos employés
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Suivez votre activité</h4>
              <p className="text-gray-600">
                Visualisez vos ventes et gérez vos finances en temps réel
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Appel à l'action */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h3 className="text-3xl font-bold mb-4">
          Prêt à digitaliser votre commerce ?
        </h3>
        <p className="text-xl text-gray-600 mb-8">
          Rejoignez des centaines de commerçants qui nous font confiance
        </p>
        <Link href="/inscription">
          <Button size="lg" className="text-lg px-12">
            Créer mon compte gratuitement
          </Button>
        </Link>
      </section>

      {/* Pied de page */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Commerce Vente. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}