// lib/prisma.ts
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var _prismaPool: Pool | undefined
  // eslint-disable-next-line no-var
  var _prismaClient: PrismaClient | undefined
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL!,
    // Config optimisée pour NextAuth adapter qui fait de petites requêtes fréquentes
    idleTimeoutMillis: 30_000,       // 30s — garde les connexions chaudes
    connectionTimeoutMillis: 10_000, // 10s pour établir une connexion
    max: 2,                          // Limité à 2 car PgBouncer pooler côté serveur gère le reste
    min: 0,                          // Pas de connexions persistantes (serverless friendly)
    allowExitOnIdle: true,           // Permet au process de se terminer proprement
  })
}

function createPrismaClient(pool: Pool) {
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Singleton : réutilise le pool et le client entre les requêtes (hot-reload en dev inclus)
const pool: Pool = globalThis._prismaPool ?? createPool()
const prisma: PrismaClient = globalThis._prismaClient ?? createPrismaClient(pool)

if (process.env.NODE_ENV !== 'production') {
  globalThis._prismaPool = pool
  globalThis._prismaClient = prisma
}

export { prisma, pool }

// ─── Retry helper ────────────────────────────────────────────────────────────
// Réessaie automatiquement les opérations Prisma qui échouent sur une erreur
// de connexion transitoire (P1017 / ConnectionClosed).
export async function avecRetry<T>(
  fn: () => Promise<T>,
  tentatives = 3,
  delai = 300,
): Promise<T> {
  let dernierreErreur: unknown
  for (let i = 0; i < tentatives; i++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      const message = (err as { message?: string })?.message || ""
      
      const estErreurConnexion = 
        code === 'P1017' || 
        code === 'P1001' || 
        message.includes("Connection terminated") ||
        message.includes("connection timeout") ||
        message.includes("unexpectedly") ||
        message.includes("timeout") ||
        message.includes("ECONNRESET") ||
        message.includes("socket hang up") ||
        message.includes("Failed to connect to upstream database") ||
        message.includes("upstream database")

      if (estErreurConnexion) {
        // Erreur de connexion transitoire → on attend et on réessaie
        dernierreErreur = err
        if (i < tentatives - 1) {
          await new Promise((r) => setTimeout(r, delai * (i + 1)))
        }
      } else {
        throw err
      }
    }
  }
  throw dernierreErreur
}