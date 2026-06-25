-- AlterTable: Publicacion — agrega campo para almacenar el motivo cuando se rechaza contenido.
ALTER TABLE "publicaciones" ADD COLUMN "motivoRechazo" TEXT;

-- AlterTable: Membresia — vincula al miembro con rol CLIENTE a su marca específica.
ALTER TABLE "membresias" ADD COLUMN "clienteId" TEXT;

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "membresias_clienteId_idx" ON "membresias"("clienteId");
