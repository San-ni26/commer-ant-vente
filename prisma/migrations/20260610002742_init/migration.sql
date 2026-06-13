/*
  Warnings:

  - A unique constraint covering the columns `[utilisateurId]` on the table `Employe` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Employe" ADD COLUMN     "utilisateurId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employe_utilisateurId_key" ON "Employe"("utilisateurId");
