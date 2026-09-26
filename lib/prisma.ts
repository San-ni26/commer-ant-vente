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
    idleTimeoutMillis: 60_000,       // 60s — garde les connexions chaudes plus longtemps
    connectionTimeoutMillis: 10_000, // 10s pour établir une connexion
    max: 3,
    min: 0,
    allowExitOnIdle: false,          // Ne pas fermer le pool en idle — évite "Connection closed"
  })
}

function createPrismaClient(pool: Pool) {
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Singleton global — réutilise pool et client entre les requêtes
// En dev, le hot-reload de Turbopack recréerait sinon un nouveau pool à chaque fichier modifié
const pool: Pool = globalThis._prismaPool ?? createPool()
const prisma: PrismaClient = globalThis._prismaClient ?? createPrismaClient(pool)

if (process.env.NODE_ENV !== 'production') {
  globalThis._prismaPool = pool
  globalThis._prismaClient = prisma
}

export { prisma, pool }

// ─── Retry helper ─────────────────────────────────────────────────────────────
// Réessaie automatiquement les opérations qui échouent sur une erreur
// de connexion transitoire (P1017, Connection closed, timeout, etc.)
export async function avecRetry<T>(
  fn: () => Promise<T>,
  tentatives = 4,
  delai = 400,
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
        code === 'P1008' ||
        message.includes("Connection closed") ||
        message.includes("Connection terminated") ||
        message.includes("connection timeout") ||
        message.includes("unexpectedly") ||
        message.includes("timeout") ||
        message.includes("ECONNRESET") ||
        message.includes("ENOTFOUND") ||
        message.includes("socket hang up") ||
        message.includes("Failed to connect") ||
        message.includes("upstream database") ||
        message.includes("Can't reach database")

      if (estErreurConnexion && i < tentatives - 1) {
        dernierreErreur = err
        // Backoff exponentiel : 400ms, 800ms, 1600ms
        await new Promise((r) => setTimeout(r, delai * Math.pow(2, i)))
        continue
      }

      throw err
    }
  }

  throw dernierreErreur
}
