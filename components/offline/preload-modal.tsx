"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Loader2, Download, CheckCircle, XCircle, WifiOff } from "lucide-react"
import {
  prechargerDonneesCommercant,
  prechargerDonneesEmploye,
  type PreloadProgress,
} from "@/lib/offline/preload-service"

interface PreloadModalProps {
  open: boolean
  userRole: "COMMERCANT" | "ADMIN" | "EMPLOYE"
  boutiqueId?: string | null
  onComplete: () => void
  onSkip?: () => void
}

export function PreloadModal({
  open,
  userRole,
  boutiqueId,
  onComplete,
  onSkip,
}: PreloadModalProps) {
  const [progress, setProgress] = useState<PreloadProgress>({
    etape: "Préparation...",
    progression: 0,
    termine: false,
  })
  const [enCours, setEnCours] = useState(false)
  const [peutIgnorer, setPeutIgnorer] = useState(false)

  // Autoriser à ignorer après 3 secondes si ça prend trop de temps
  useEffect(() => {
    if (enCours && !progress.termine) {
      const timer = setTimeout(() => setPeutIgnorer(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [enCours, progress.termine])

  const demarrerPrechargement = async () => {
    setEnCours(true)
    setPeutIgnorer(false)

    try {
      if (userRole === "EMPLOYE" && boutiqueId) {
        await prechargerDonneesEmploye(boutiqueId, setProgress)
      } else if (userRole === "COMMERCANT" || userRole === "ADMIN") {
        await prechargerDonneesCommercant(setProgress)
      }

      // Attendre 500ms pour que l'utilisateur voie "100%"
      setTimeout(() => {
        onComplete()
      }, 500)
    } catch (erreur) {
      console.error("Erreur préchargement:", erreur)
      // En cas d'erreur, on laisse quand même continuer
      setPeutIgnorer(true)
    }
  }

  const ignorer = () => {
    onSkip?.()
    onComplete()
  }

  // Démarrage automatique à l'ouverture
  useEffect(() => {
    if (open && !enCours && !progress.termine) {
      // Petit délai pour l'animation d'ouverture du modal
      const timer = setTimeout(() => demarrerPrechargement(), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!open) return null

  const isSuccess = progress.termine && !progress.erreur
  const isError = progress.termine && !!progress.erreur

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess && <CheckCircle className="h-5 w-5 text-green-600" />}
            {isError && <XCircle className="h-5 w-5 text-red-600" />}
            {!progress.termine && <Download className="h-5 w-5 text-blue-600" />}
            {isSuccess
              ? "Préchargement terminé !"
              : isError
              ? "Erreur de préchargement"
              : "Préparation du mode hors ligne"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message explicatif */}
          {!progress.termine && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <WifiOff className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">
                  Téléchargement de vos données pour un accès hors ligne
                </p>
                <p className="text-xs text-blue-700">
                  Vous pourrez travailler même sans connexion internet
                </p>
              </div>
            </div>
          )}

          {/* Étape en cours */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{progress.etape}</span>
              <span className="font-medium text-gray-900">{progress.progression}%</span>
            </div>

            {/* Barre de progression */}
            <Progress value={progress.progression} className="h-2" />
          </div>

          {/* Message d'erreur */}
          {isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">{progress.erreur}</p>
              <p className="text-xs text-red-700 mt-1">
                Vous pouvez continuer mais certaines fonctionnalités hors ligne seront
                limitées.
              </p>
            </div>
          )}

          {/* Message de succès */}
          {isSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900 font-medium">
                ✓ Toutes vos données sont maintenant disponibles hors ligne
              </p>
              <p className="text-xs text-green-700 mt-1">
                Vous pouvez travailler sans connexion internet pendant 24h
              </p>
            </div>
          )}

          {/* Loader animé */}
          {enCours && !progress.termine && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {peutIgnorer && !progress.termine && (
            <Button variant="ghost" onClick={ignorer} size="sm">
              Ignorer pour l'instant
            </Button>
          )}
          {(isError || peutIgnorer) && !progress.termine && (
            <Button onClick={ignorer} size="sm">
              Continuer quand même
            </Button>
          )}
          {progress.termine && (
            <Button onClick={onComplete} size="sm" className="w-full">
              {isSuccess ? "Commencer" : "Continuer"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
