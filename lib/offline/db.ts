// lib/offline/db.ts
// Base de données locale IndexedDB pour le mode hors-ligne
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'commerce-vente-offline'
const DB_VERSION = 1

export interface SyncQueueItem {
  id?: number
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  body?: unknown
  createdAt: number
  attempts: number
  maxAttempts: number
  tag: string // ex: 'vente:creer', 'transaction:creer'
  localId?: string // ID temporaire généré localement
}

export interface BoutiqueLocale {
  id: string
  nom: string
  solde: number
  gerantId?: string | null
  dateCreation: string
  dateMiseAJour: string
  gerant?: { id: string; nom: string; prenom: string; email: string } | null
  _count: { ventes: number; transactions: number; employes: number }
  syncedAt: number // timestamp de la dernière sync
}

export interface VenteLocale {
  id: string
  montant: number
  description?: string | null
  boutiqueId: string
  enregistreParId: string
  dateVente: string
  dateCreation: string
  enregistrePar?: { nom: string; prenom: string }
  syncedAt: number
  enAttente?: boolean // true si créée hors-ligne
}

export interface TransactionLocale {
  id: string
  type: string
  montant: number
  description?: string | null
  reference?: string | null
  boutiqueId: string
  verifiee: boolean
  verifieeParId?: string | null
  dateTransaction: string
  dateCreation: string
  syncedAt: number
  enAttente?: boolean
}

export interface EmployeLocal {
  id: string
  nom: string
  prenom?: string | null
  telephone: string
  code: string
  boutiqueId?: string | null
  syncedAt: number
}

// Schéma complet de la base
export type CommerceDB = {
  boutiques: {
    key: string
    value: BoutiqueLocale
    indexes: { 'by-synced': number }
  }
  ventes: {
    key: string
    value: VenteLocale
    indexes: { 'by-boutique': string; 'by-date': string; 'by-pending': number }
  }
  transactions: {
    key: string
    value: TransactionLocale
    indexes: { 'by-boutique': string; 'by-date': string; 'by-pending': number }
  }
  employes: {
    key: string
    value: EmployeLocal
    indexes: { 'by-boutique': string }
  }
  sync_queue: {
    key: number
    value: SyncQueueItem
    indexes: { 'by-tag': string; 'by-created': number }
  }
}

let dbPromise: Promise<IDBPDatabase<CommerceDB>> | null = null

export function getDB(): Promise<IDBPDatabase<CommerceDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CommerceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store boutiques
        if (!db.objectStoreNames.contains('boutiques')) {
          const boutiquesStore = db.createObjectStore('boutiques', { keyPath: 'id' })
          boutiquesStore.createIndex('by-synced', 'syncedAt')
        }

        // Store ventes
        if (!db.objectStoreNames.contains('ventes')) {
          const ventesStore = db.createObjectStore('ventes', { keyPath: 'id' })
          ventesStore.createIndex('by-boutique', 'boutiqueId')
          ventesStore.createIndex('by-date', 'dateVente')
          ventesStore.createIndex('by-pending', 'enAttente')
        }

        // Store transactions
        if (!db.objectStoreNames.contains('transactions')) {
          const transStore = db.createObjectStore('transactions', { keyPath: 'id' })
          transStore.createIndex('by-boutique', 'boutiqueId')
          transStore.createIndex('by-date', 'dateTransaction')
          transStore.createIndex('by-pending', 'enAttente')
        }

        // Store employés
        if (!db.objectStoreNames.contains('employes')) {
          const empStore = db.createObjectStore('employes', { keyPath: 'id' })
          empStore.createIndex('by-boutique', 'boutiqueId')
        }

        // Store queue de synchronisation
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true,
          })
          queueStore.createIndex('by-tag', 'tag')
          queueStore.createIndex('by-created', 'createdAt')
        }
      },
      blocked() {
        console.warn('[IDB] Base bloquée par une version plus ancienne ouverte dans un autre onglet')
      },
      blocking() {
        dbPromise = null
      },
      terminated() {
        dbPromise = null
      },
    })
  }
  return dbPromise
}

// ─────────────────────────────────────────────
// BOUTIQUES
// ─────────────────────────────────────────────
export async function getBoutiquesLocales(): Promise<BoutiqueLocale[]> {
  const db = await getDB()
  return db.getAll('boutiques')
}

export async function saveBoutiquesLocales(boutiques: BoutiqueLocale[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('boutiques', 'readwrite')
  await Promise.all([
    ...boutiques.map((b) => tx.store.put(b)),
    tx.done,
  ])
}

export async function getBoutiqueLocale(id: string): Promise<BoutiqueLocale | undefined> {
  const db = await getDB()
  return db.get('boutiques', id)
}

export async function saveBoutiqueLocale(boutique: BoutiqueLocale): Promise<void> {
  const db = await getDB()
  await db.put('boutiques', boutique)
}

// ─────────────────────────────────────────────
// VENTES
// ─────────────────────────────────────────────
export async function getVentesLocales(boutiqueId: string): Promise<VenteLocale[]> {
  const db = await getDB()
  return db.getAllFromIndex('ventes', 'by-boutique', boutiqueId)
}

export async function saveVentesLocales(ventes: VenteLocale[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('ventes', 'readwrite')
  await Promise.all([
    ...ventes.map((v) => tx.store.put(v)),
    tx.done,
  ])
}

export async function saveVenteLocale(vente: VenteLocale): Promise<void> {
  const db = await getDB()
  await db.put('ventes', vente)
}

export async function deleteVenteLocale(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('ventes', id)
}

// ─────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────
export async function getTransactionsLocales(boutiqueId: string): Promise<TransactionLocale[]> {
  const db = await getDB()
  return db.getAllFromIndex('transactions', 'by-boutique', boutiqueId)
}

export async function saveTransactionsLocales(transactions: TransactionLocale[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('transactions', 'readwrite')
  await Promise.all([
    ...transactions.map((t) => tx.store.put(t)),
    tx.done,
  ])
}

export async function saveTransactionLocale(transaction: TransactionLocale): Promise<void> {
  const db = await getDB()
  await db.put('transactions', transaction)
}

// ─────────────────────────────────────────────
// EMPLOYÉS
// ─────────────────────────────────────────────
export async function getEmployesLocaux(boutiqueId: string): Promise<EmployeLocal[]> {
  const db = await getDB()
  return db.getAllFromIndex('employes', 'by-boutique', boutiqueId)
}

export async function saveEmployesLocaux(employes: EmployeLocal[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('employes', 'readwrite')
  await Promise.all([
    ...employes.map((e) => tx.store.put(e)),
    tx.done,
  ])
}

// ─────────────────────────────────────────────
// QUEUE DE SYNCHRONISATION
// ─────────────────────────────────────────────
export async function ajouterALaQueue(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
  const db = await getDB()
  return db.add('sync_queue', item)
}

export async function getQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAllFromIndex('sync_queue', 'by-created')
}

export async function supprimerDeQueue(id: number): Promise<void> {
  const db = await getDB()
  await db.delete('sync_queue', id)
}

export async function mettreAJourQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB()
  await db.put('sync_queue', item)
}

export async function viderQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('sync_queue')
}

export async function compterQueue(): Promise<number> {
  const db = await getDB()
  return db.count('sync_queue')
}
