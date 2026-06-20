-- CreateEnum
CREATE TYPE "TonoComunicacion" AS ENUM ('FORMAL', 'INFORMAL', 'CASUAL', 'PROFESIONAL', 'CERCANO', 'INSPIRADOR', 'HUMORISTICO');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoContenido" AS ENUM ('BORRADOR', 'EN_REVISION', 'APROBADO', 'PROGRAMADO', 'PUBLICADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sector" TEXT,
    "descripcion" TEXT,
    "logoUrl" TEXT,
    "organizacionId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estrategias_de_marca" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "publicoObjetivo" TEXT NOT NULL,
    "tono" "TonoComunicacion" NOT NULL DEFAULT 'PROFESIONAL',
    "pilares" TEXT[],
    "restricciones" TEXT,
    "clienteId" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estrategias_de_marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicaciones" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "imagenUrl" TEXT,
    "canal" "Canal" NOT NULL,
    "estado" "EstadoContenido" NOT NULL DEFAULT 'BORRADOR',
    "fechaProgramada" TIMESTAMP(3),
    "estrategiaId" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clientes_organizacionId_idx" ON "clientes"("organizacionId");

-- CreateIndex
CREATE INDEX "estrategias_de_marca_organizacionId_idx" ON "estrategias_de_marca"("organizacionId");

-- CreateIndex
CREATE INDEX "estrategias_de_marca_clienteId_idx" ON "estrategias_de_marca"("clienteId");

-- CreateIndex
CREATE INDEX "publicaciones_organizacionId_idx" ON "publicaciones"("organizacionId");

-- CreateIndex
CREATE INDEX "publicaciones_estrategiaId_idx" ON "publicaciones"("estrategiaId");

-- CreateIndex
CREATE INDEX "publicaciones_fechaProgramada_idx" ON "publicaciones"("fechaProgramada");

-- CreateIndex
CREATE INDEX "publicaciones_estado_idx" ON "publicaciones"("estado");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estrategias_de_marca" ADD CONSTRAINT "estrategias_de_marca_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estrategias_de_marca" ADD CONSTRAINT "estrategias_de_marca_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_estrategiaId_fkey" FOREIGN KEY ("estrategiaId") REFERENCES "estrategias_de_marca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
