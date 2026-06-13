import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Querying users and boutiques...");
  const users = await prisma.utilisateur.findMany();
  console.log("Users:", users.map(u => ({ id: u.id, email: u.email, role: u.role })));
  
  const boutiques = await prisma.boutique.findMany();
  console.log("Boutiques:", boutiques.map(b => ({ id: b.id, nom: b.nom, commercantId: b.commercantId, gerantId: b.gerantId })));
}

main().catch(e => {
  console.error("Connection failed!");
  console.error(e);
});
