// lib/offline/preload-service.ts
// Service de préchargement complet des données utilisateur à la connexion

import {
  saveBoutiquesLocales,
  saveEmployesLocaux,
  saveVentesLocales,
  saveTransactionsLocales,
  type BoutiqueLocale,
  type EmployeLocal,
  type VenteLocale,
  type TransactionLocale,
} from "./db"

export interface PreloadProgress {
  etape: string
  progression: number // 0-100
  termine: boolean
  erreur?: string
}

export type PreloadCallback = (progress: PreloadProgress) => void

/**
 * Précharge les pages HTML dans le Service Worker
 */
async function prechargerPagesHTML(
  role: string,
  boutiques?: { id: string }[] | null,
  boutiqueId?: string | null
): Promise<void> {
  const pagesToCache: string[] = []

  if (role === "COMMERCANT" || role === "ADMIN") {
    pagesToCache.push(
      "/commercant",
      "/commercant/boutiques",
      "/commercant/employes",
      "/commercant/rapports"
    )

    // Ajouter les pages spécifiques pour chaque boutique du commerçant
    if (boutiques && boutiques.length > 0) {
      for (const b of boutiques) {
        pagesToCache.push(
          `/commercant/boutiques/${b.id}`,
          `/commercant/boutiques/${b.id}/ventes`,
          `/commercant/boutiques/${b.id}/transactions`
        )
      }
    }
  } else if (role === "EMPLOYE" && boutiqueId) {
    pagesToCache.push(
      "/employe",
      "/employe/ventes"
    )
  }

  // Précharger chaque page via fetch — le SW les mettra automatiquement en cache
  await Promise.allSettled(
    pagesToCache.map(async (url) => {
      try {
        await fetch(url, {
          method: "GET",
          credentials: "same-origin",
          headers: { "Accept": "text/html" },
        })
        // Petit délai pour ne pas surcharger
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (err) {
        console.warn(`[Preload] Échec préchargement page ${url}:`, err)
      }
    })
  )
}

/**
 * Précharge toutes les données d'un commerçant
 */
export async function prechargerDonneesCommercant(
  onProgress?: PreloadCallback
): Promise<void> {
  const etapes = [
    { nom: "Chargement des boutiques", poids: 15 },
    { nom: "Chargement des employés", poids: 10 },
    { nom: "Chargement des ventes", poids: 30 },
    { nom: "Chargement des transactions", poids: 20 },
    { nom: "Mise en cache des pages", poids: 15 },
    { nom: "Finalisation", poids: 10 },
  ]

  let progressionTotale = 0

  const rapporterProgression = (etape: string, progression: number) => {
    onProgress?.({ etape, progression, termine: false })
  }

  const rapporterErreur = (etape: string, erreur: string) => {
    onProgress?.({ etape, progression: progressionTotale, termine: true, erreur })
  }

  try {
    // Étape 1 : Charger les boutiques
    rapporterProgression(etapes[0].nom, 0)
    const boutiquesReponse = await fetch("/api/boutiques")
    if (!boutiquesReponse.ok) throw new Error("Échec chargement boutiques")
    
    const boutiques: any[] = await boutiquesReponse.json()
    
    await saveBoutiquesLocales(
      boutiques.map(
        (b): BoutiqueLocale => ({
          id: b.id,
          nom: b.nom,
          solde: b.solde || 0,
          gerantId: b.gerantId || null,
          dateCreation: b.dateCreation || new Date().toISOString(),
          dateMiseAJour: b.dateMiseAJour || new Date().toISOString(),
          gerant: b.gerant
            ? {
                id: b.gerant.id,
                nom: b.gerant.nom,
                prenom: b.gerant.prenom || "",
                email: b.gerant.email || "",
              }
            : null,
          _count: {
            ventes: b._count?.ventes || 0,
            transactions: b._count?.transactions || 0,
            employes: b._count?.employes || 0,
          },
          syncedAt: Date.now(),
        })
      )
    )
    progressionTotale += etapes[0].poids
    rapporterProgression(etapes[0].nom, progressionTotale)

    // Étape 2 : Charger tous les employés
    rapporterProgression(etapes[1].nom, progressionTotale)
    const employesReponse = await fetch("/api/employes")
    if (!employesReponse.ok) throw new Error("Échec chargement employés")
    
    const employes: any[] = await employesReponse.json()
    
    // Grouper par boutique
    const employesParBoutique = new Map<string, any[]>()
    for (const emp of employes) {
      if (emp.boutiqueId) {
        const liste = employesParBoutique.get(emp.boutiqueId) || []
        liste.push(emp)
        employesParBoutique.set(emp.boutiqueId, liste)
      }
    }

    for (const [boutiqueId, emps] of employesParBoutique) {
      await saveEmployesLocaux(
        emps.map(
          (e): EmployeLocal => ({
            id: e.id,
            nom: e.nom,
            prenom: e.prenom,
            telephone: e.telephone,
            code: e.code,
            boutiqueId: e.boutiqueId,
            syncedAt: Date.now(),
          })
        )
      )
    }
    progressionTotale += etapes[1].poids
    rapporterProgression(etapes[1].nom, progressionTotale)

    // Étape 3 : Charger les ventes pour chaque boutique
    rapporterProgression(etapes[2].nom, progressionTotale)
    const progressionParBoutique = boutiques.length > 0
      ? etapes[2].poids / boutiques.length
      : etapes[2].poids

    for (let i = 0; i < boutiques.length; i++) {
      const boutique = boutiques[i]
      try {
        const ventesReponse = await fetch(`/api/boutiques/${boutique.id}/ventes`)
        if (ventesReponse.ok) {
          const ventes: any[] = await ventesReponse.json()
          await saveVentesLocales(
            ventes.map(
              (v): VenteLocale => ({
                id: v.id,
                montant: v.montant,
                description: v.description || null,
                dateVente: v.dateVente,
                dateCreation: v.dateCreation || v.dateVente,
                boutiqueId: boutique.id,
                enregistreParId: v.enregistreParId,
                enregistrePar: v.enregistrePar
                  ? {
                      nom: v.enregistrePar.nom,
                      prenom: v.enregistrePar.prenom || "",
                    }
                  : undefined,
                syncedAt: Date.now(),
              })
            )
          )
        }
      } catch (e) {
        console.warn(`Impossible de charger les ventes pour ${boutique.nom}:`, e)
      }
      progressionTotale += progressionParBoutique
      rapporterProgression(etapes[2].nom, Math.floor(progressionTotale))
    }

    // Étape 4 : Charger les transactions pour chaque boutique
    rapporterProgression(etapes[3].nom, progressionTotale)
    const progressionParBoutiqueTransactions = etapes[3].poids / Math.max(boutiques.length, 1)

    for (let i = 0; i < boutiques.length; i++) {
      const boutique = boutiques[i]
      try {
        const transactionsReponse = await fetch(
          `/api/boutiques/${boutique.id}/transactions`
        )
        if (transactionsReponse.ok) {
          const json = await transactionsReponse.json()
          // L'API retourne { transactions, totaux } — on extrait le tableau
          const transactionsArray: any[] = Array.isArray(json)
            ? json
            : json.transactions ?? []

          await saveTransactionsLocales(
            transactionsArray.map(
              (t): TransactionLocale => ({
                id: t.id,
                type: t.type,
                montant: t.montant ?? t.amount ?? 0,
                description: t.description || null,
                reference: t.reference || null,
                dateTransaction: t.dateTransaction ?? t.transactionDate ?? new Date().toISOString(),
                dateCreation: t.dateCreation ?? t.dateTransaction ?? new Date().toISOString(),
                verifiee: t.verifiee ?? t.verified ?? false,
                boutiqueId: boutique.id,
                verifieeParId: t.verifieeParId ?? t.verifiedBy ?? null,
                syncedAt: Date.now(),
              })
            )
          )
        }
      } catch (e) {
        console.warn(`Impossible de charger les transactions pour ${boutique.nom}:`, e)
      }
      progressionTotale += progressionParBoutiqueTransactions
      rapporterProgression(etapes[3].nom, Math.floor(progressionTotale))
    }

    // Étape 5 : Précharger les pages HTML dans le Service Worker
    rapporterProgression(etapes[4].nom, progressionTotale)
    await prechargerPagesHTML("COMMERCANT", boutiques)
    progressionTotale += etapes[4].poids
    rapporterProgression(etapes[4].nom, progressionTotale)

    // Étape 6 : Finalisation
    rapporterProgression(etapes[5].nom, 95)
    
    // Marquer le préchargement comme terminé dans localStorage
    localStorage.setItem("preload_completed", Date.now().toString())
    
    progressionTotale = 100
    rapporterProgression("Préchargement terminé", 100)
    
    onProgress?.({ etape: "Préchargement terminé", progression: 100, termine: true })
  } catch (erreur: any) {
    console.error("Erreur lors du préchargement:", erreur)
    rapporterErreur(
      "Erreur",
      erreur.message || "Une erreur est survenue lors du préchargement"
    )
    throw erreur
  }
}

/**
 * Précharge les données d'un employé (boutique unique)
 */
export async function prechargerDonneesEmploye(
  boutiqueId: string,
  onProgress?: PreloadCallback
): Promise<void> {
  const etapes = [
    { nom: "Chargement de la boutique", poids: 20 },
    { nom: "Chargement des ventes", poids: 45 },
    { nom: "Mise en cache des pages", poids: 20 },
    { nom: "Finalisation", poids: 15 },
  ]

  let progressionTotale = 0

  const rapporterProgression = (etape: string, progression: number) => {
    onProgress?.({ etape, progression, termine: false })
  }

  try {
    // Étape 1 : Charger les infos de la boutique via la route employé
    // (plus fiable que /details qui vérifie les droits commerçant)
    rapporterProgression(etapes[0].nom, 0)

    // On essaie d'abord /details avec le fix accès employé
    // Fallback sur /api/employe/dashboard si ça échoue
    let boutiqueData: any = null

    const boutiqueReponse = await fetch(`/api/boutiques/${boutiqueId}/details`)
    if (boutiqueReponse.ok) {
      boutiqueData = await boutiqueReponse.json()
    } else {
      // Fallback : récupérer depuis le dashboard employé
      const dashReponse = await fetch(`/api/employe/dashboard`)
      if (dashReponse.ok) {
        const dash = await dashReponse.json()
        boutiqueData = dash.employe?.boutique
          ? {
              id: dash.employe.boutique.id,
              nom: dash.employe.boutique.nom,
              solde: dash.employe.boutique.solde || 0,
              gerantId: null,
              dateCreation: new Date().toISOString(),
              dateMiseAJour: new Date().toISOString(),
              gerant: null,
              _count: { ventes: 0, transactions: 0, employes: 0 },
            }
          : null
      }
    }

    if (!boutiqueData) throw new Error("Boutique non trouvée")
    
    await saveBoutiquesLocales([
      {
        id: boutiqueData.id,
        nom: boutiqueData.nom,
        solde: boutiqueData.solde || 0,
        gerantId: boutiqueData.gerantId || null,
        dateCreation: boutiqueData.dateCreation || new Date().toISOString(),
        dateMiseAJour: boutiqueData.dateMiseAJour || new Date().toISOString(),
        gerant: boutiqueData.gerant || null,
        _count: boutiqueData._count || { ventes: 0, transactions: 0, employes: 0 },
        syncedAt: Date.now(),
      },
    ])
    progressionTotale += etapes[0].poids
    rapporterProgression(etapes[0].nom, progressionTotale)

    // Étape 2 : Charger les ventes
    rapporterProgression(etapes[1].nom, progressionTotale)
    const ventesReponse = await fetch(`/api/boutiques/${boutiqueData.id}/ventes`)
    if (ventesReponse.ok) {
      const ventes: any[] = await ventesReponse.json()
      await saveVentesLocales(
        ventes.map(
          (v): VenteLocale => ({
            id: v.id,
            montant: v.montant,
            description: v.description || null,
            dateVente: v.dateVente,
            dateCreation: v.dateCreation || v.dateVente,
            boutiqueId: boutiqueData.id,
            enregistreParId: v.enregistreParId,
            enregistrePar: v.enregistrePar
              ? { nom: v.enregistrePar.nom, prenom: v.enregistrePar.prenom || "" }
              : undefined,
            syncedAt: Date.now(),
          })
        )
      )
    }
    progressionTotale += etapes[1].poids
    rapporterProgression(etapes[1].nom, progressionTotale)

    // Étape 3 : Précharger les pages HTML
    rapporterProgression(etapes[2].nom, progressionTotale)
    await prechargerPagesHTML("EMPLOYE", null, boutiqueData.id)
    progressionTotale += etapes[2].poids
    rapporterProgression(etapes[2].nom, progressionTotale)

    // Étape 4 : Finalisation
    rapporterProgression(etapes[3].nom, 95)
    localStorage.setItem("preload_completed", Date.now().toString())
    progressionTotale = 100
    
    onProgress?.({ etape: "Préchargement terminé", progression: 100, termine: true })
  } catch (erreur: any) {
    console.error("Erreur lors du préchargement employé:", erreur)
    onProgress?.({
      etape: "Erreur",
      progression: progressionTotale,
      termine: true,
      erreur: erreur.message,
    })
    throw erreur
  }
}

/**
 * Vérifie si le préchargement a déjà été effectué (moins de 8h)
 * On réduit à 8h (au lieu de 24h) pour forcer un rafraîchissement plus fréquent
 */
export function preloadEstRecent(): boolean {
  if (typeof window === "undefined") return false

  const dernierPreload = localStorage.getItem("preload_completed")
  if (!dernierPreload) return false

  const timestamp = parseInt(dernierPreload, 10)
  if (isNaN(timestamp)) return false

  const age = Date.now() - timestamp

  // Préchargement valide pendant 8h seulement
  return age < 8 * 60 * 60 * 1000
}

/**
 * Force un nouveau préchargement (invalide le cache)
 */
export function invalidatePreload(): void {
  localStorage.removeItem("preload_completed")
}
