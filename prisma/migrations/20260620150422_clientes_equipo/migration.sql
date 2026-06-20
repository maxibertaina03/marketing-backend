-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('POTENCIAL', 'ACTIVO', 'PAUSADO', 'ARCHIVADO');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rubro" TEXT,
    "ubicacion" TEXT,
    "sitioWeb" TEXT,
    "contactoNombre" TEXT,
    "contactoEmail" TEXT,
    "contactoTelefono" TEXT,
    "redes" JSONB,
    "logoUrl" TEXT,
    "paletaColores" TEXT[],
    "tono" TEXT,
    "publicoObjetivo" TEXT,
    "productosServicios" TEXT,
    "objetivos" TEXT,
    "competencia" TEXT,
    "promociones" TEXT,
    "estado" "EstadoCliente" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitaciones" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'COMMUNITY_MANAGER',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clientes_organizacionId_idx" ON "clientes"("organizacionId");

-- CreateIndex
CREATE INDEX "invitaciones_email_idx" ON "invitaciones"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_organizacionId_email_key" ON "invitaciones"("organizacionId", "email");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
