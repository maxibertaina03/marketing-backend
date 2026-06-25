-- AlterTable: Invitacion — vincula la invitación de un CLIENTE a su marca.
-- Se copia a la membresía al aplicar la invitación.
ALTER TABLE "invitaciones" ADD COLUMN "clienteId" TEXT;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "invitaciones_clienteId_idx" ON "invitaciones"("clienteId");
