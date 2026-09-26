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
async function prechargerPagesHTML(role: string, boutiqueId?: string | null): Promise<void> {
  const pagesToCache: string[] = []

  if (role === "COMMERCANT" || role === "ADMIN") {
    pagesToCache.push(
      "/commercant",
      "/commercant/boutiques",
      "/commercant/employes",
      "/commercant/rapports"
    )
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
        await new Promise(resolve => setTimeout(resolve, 100))
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
    const progressionParBoutique = etapes[2].poids / boutiques.length

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
    const progressionParBoutiqueTransactions = etapes[3].poids / boutiques.length

    for (let i = 0; i < boutiques.length; i++) {
      const boutique = boutiques[i]
      try {
        const transactionsReponse = await fetch(
          `/api/boutiques/${boutique.id}/transactions`
        )
        if (transactionsReponse.ok) {
          const transactions: any[] = await transactionsReponse.json()
          await saveTransactionsLocales(
            transactions.map(
              (t): TransactionLocale => ({
                id: t.id,
                type: t.type,
                montant: t.amount || t.montant,
                description: t.description || null,
                reference: t.reference || null,
                dateTransaction: t.transactionDate || t.dateTransaction,
                dateCreation: t.dateCreation || t.transactionDate || t.dateTransaction,
                verifiee: t.verified || t.verifiee || false,
                boutiqueId: boutique.id,
                verifieeParId: t.verifiedBy || t.verifieeParId || null,
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
    await prechargerPagesHTML("COMMERCANT")
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
    // Étape 1 : Charger les infos de la boutique
    rapporterProgression(etapes[0].nom, 0)
    const boutiqueReponse = await fetch(`/api/boutiques/${boutiqueId}/details`)
    if (!boutiqueReponse.ok) throw new Error("Échec chargement boutique")
    
    const boutique: any = await boutiqueReponse.json()
    
    await saveBoutiquesLocales([
      {
        id: boutique.id,
        nom: boutique.nom,
        solde: boutique.solde || 0,
        gerantId: boutique.gerantId || null,
        dateCreation: boutique.dateCreation || new Date().toISOString(),
        dateMiseAJour: boutique.dateMiseAJour || new Date().toISOString(),
        gerant: boutique.gerant || null,
        _count: boutique._count || { ventes: 0, transactions: 0, employes: 0 },
        syncedAt: Date.now(),
      },
    ])
    progressionTotale += etapes[0].poids
    rapporterProgression(etapes[0].nom, progressionTotale)

    // Étape 2 : Charger les ventes
    rapporterProgression(etapes[1].nom, progressionTotale)
    const ventesReponse = await fetch(`/api/boutiques/${boutiqueId}/ventes`)
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
            boutiqueId: boutiqueId,
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
    await prechargerPagesHTML("EMPLOYE", boutiqueId)
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
 * Vérifie si le préchargement a déjà été effectué (moins de 24h)
 */
export function preloadEstRecent(): boolean {
  const dernierPreload = localStorage.getItem("preload_completed")
  if (!dernierPreload) return false
  
  const timestamp = parseInt(dernierPreload, 10)
  const age = Date.now() - timestamp
  
  // Préchargement valide pendant 24h
  return age < 24 * 60 * 60 * 1000
}

/**
 * Force un nouveau préchargement (invalide le cache)
 */
export function invalidatePreload(): void {
  localStorage.removeItem("preload_completed")
}
