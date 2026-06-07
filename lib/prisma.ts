// src/lib/prisma.ts
import { PrismaClient } from '../app/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Pour Prisma 7.x, on doit passer un objet vide
export const prisma = globalForPrisma.prisma ?? new PrismaClient({} as any)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma