-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COMMERCANT', 'EMPLOYE');

-- CreateEnum
CREATE TYPE "DureeAbonnement" AS ENUM ('UN_MOIS', 'TROIS_MOIS', 'SIX_MOIS', 'UN_AN');

-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ACTIF', 'EXPIRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeTransaction" AS ENUM ('VENTE', 'VERSEMENT', 'DEPENSE', 'VIREMENT_BANCAIRE', 'RETRAIT');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "telephone" TEXT,
    "emailVerifie" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'COMMERCANT',
    "tokenVerification" TEXT,
    "tokenReinitialisation" TEXT,
    "dateExpirationToken" TIMESTAMP(3),
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMiseAJour" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boutique" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "commercantId" TEXT NOT NULL,
    "gerantId" TEXT,
    "solde" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMiseAJour" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Boutique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employe" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "telephone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "boutiqueId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateMiseAJour" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vente" (
    "id" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "boutiqueId" TEXT NOT NULL,
    "enregistreParId" TEXT NOT NULL,
    "dateVente" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TypeTransaction" NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "boutiqueId" TEXT NOT NULL,
    "verifiee" BOOLEAN NOT NULL DEFAULT false,
    "verifieeParId" TEXT,
    "dateTransaction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL,
    "boutiqueId" TEXT NOT NULL,
    "commercantId" TEXT NOT NULL,
    "duree" "DureeAbonnement" NOT NULL,
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'ACTIF',
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_tokenVerification_key" ON "Utilisateur"("tokenVerification");

-- CreateIndex
CREATE UNIQUE INDEX "Boutique_gerantId_key" ON "Boutique"("gerantId");

-- CreateIndex
CREATE UNIQUE INDEX "Employe_code_key" ON "Employe"("code");

-- AddForeignKey
ALTER TABLE "Boutique" ADD CONSTRAINT "Boutique_commercantId_fkey" FOREIGN KEY ("commercantId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boutique" ADD CONSTRAINT "Boutique_gerantId_fkey" FOREIGN KEY ("gerantId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employe" ADD CONSTRAINT "Employe_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_enregistreParId_fkey" FOREIGN KEY ("enregistreParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_verifieeParId_fkey" FOREIGN KEY ("verifieeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_commercantId_fkey" FOREIGN KEY ("commercantId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
