/*
  Warnings:

  - Added the required column `clienteId` to the `publicaciones` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "publicaciones" DROP CONSTRAINT "publicaciones_estrategiaId_fkey";

-- AlterTable
ALTER TABLE "publicaciones" ADD COLUMN     "clienteId" TEXT NOT NULL,
ALTER COLUMN "estrategiaId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "publicaciones_clienteId_idx" ON "publicaciones"("clienteId");

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_estrategiaId_fkey" FOREIGN KEY ("estrategiaId") REFERENCES "estrategias_de_marca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
