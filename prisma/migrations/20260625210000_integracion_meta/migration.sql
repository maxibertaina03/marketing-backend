-- AlterTable: id del post real en Instagram/Facebook (cuando la publicación viene de Meta)
ALTER TABLE "publicaciones" ADD COLUMN "metaMediaId" TEXT;

-- CreateTable: conexión de un cliente con su cuenta de Instagram/Facebook vía Meta
CREATE TABLE "conexiones_meta" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageNombre" TEXT,
    "accessToken" TEXT NOT NULL,
    "igUserId" TEXT NOT NULL,
    "igUsername" TEXT,
    "tokenExpiraEn" TIMESTAMP(3),
    "ultimaSync" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conexiones_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publicaciones_clienteId_metaMediaId_idx" ON "publicaciones"("clienteId", "metaMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "conexiones_meta_clienteId_key" ON "conexiones_meta"("clienteId");

-- CreateIndex
CREATE INDEX "conexiones_meta_organizacionId_idx" ON "conexiones_meta"("organizacionId");

-- AddForeignKey
ALTER TABLE "conexiones_meta" ADD CONSTRAINT "conexiones_meta_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conexiones_meta" ADD CONSTRAINT "conexiones_meta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
