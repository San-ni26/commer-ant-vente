import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Querying users, boutiques, and subscriptions...");
  const users = await prisma.utilisateur.findMany();
  console.log("Users:", users.map(u => ({ id: u.id, email: u.email, role: u.role })));
  
  const boutiques = await prisma.boutique.findMany();
  console.log("Boutiques:", boutiques.map(b => ({ id: b.id, nom: b.nom, commercantId: b.commercantId, gerantId: b.gerantId })));

  const abonnements = await prisma.abonnement.findMany();
  console.log("Abonnements:", abonnements.map(a => ({
    id: a.id,
    boutiqueId: a.boutiqueId,
    commercantId: a.commercantId,
    duree: a.duree,
    statut: a.statut,
    dateDebut: a.dateDebut,
    dateFin: a.dateFin,
  })));
}

main()
  .catch(e => {
    console.error("Connection failed!");
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
