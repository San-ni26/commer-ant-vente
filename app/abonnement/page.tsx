// app/abonnement/page.tsx
import Link from "next/link"
import { Phone, CheckCircle, ArrowLeft, Store } from "lucide-react"

export const metadata = {
  title: "Abonnement - Commerce Vente",
  description: "Activez votre abonnement 12 mois pour débloquer toutes les fonctionnalités.",
}

export default function PageAbonnement() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-900 flex flex-col items-center justify-center px-4 py-16">

      {/* Retour */}
      <Link
        href="/commercant"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-blue-300 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au tableau de bord
      </Link>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/30">
          <Store className="h-7 w-7 text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-wide">Commerce Vente</span>
      </div>

      {/* Carte principale */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl text-center">

        {/* Badge Offre */}
        <div className="inline-block mb-5 px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold tracking-widest uppercase">
          Offre 12 Mois
        </div>

        <h1 className="text-3xl font-black text-white mb-3">
          Activer votre abonnement
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Contactez notre service commercial par téléphone pour souscrire à l'abonnement annuel et débloquer l'accès complet à la plateforme.
        </p>

        {/* Numéro de téléphone */}
        <a
          href="tel:+22394141804"
          className="group flex items-center justify-center gap-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-2xl rounded-2xl px-8 py-6 transition-all duration-200 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.03] select-none"
        >
          <div className="bg-white/20 p-3 rounded-xl group-hover:bg-white/30 transition-all">
            <Phone className="h-6 w-6 animate-pulse" />
          </div>
          94 14 18 04
        </a>

        <p className="text-gray-500 text-xs mt-4">
          Appuyez sur le numéro pour appeler directement
        </p>

        {/* Avantages inclus */}
        <div className="mt-8 pt-6 border-t border-white/10 space-y-3 text-left">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">Inclus dans l'abonnement annuel :</p>
          {[
            "Accès illimité à toutes vos boutiques",
            "Gestion complète des ventes et employés",
            "Rapports & statistiques avancées",
            "Export PDF des rapports de ventes",
            "Support technique prioritaire",
            "Application PWA installable",
          ].map((avantage, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-300 text-sm">{avantage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Note de bas de page */}
      <p className="mt-8 text-gray-600 text-xs text-center max-w-sm">
        Notre équipe commerciale est disponible du lundi au vendredi de 8h à 18h (GMT).
        L'activation est immédiate après confirmation du paiement.
      </p>
    </div>
  )
}
