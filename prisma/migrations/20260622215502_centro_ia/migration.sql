-- CreateEnum
CREATE TYPE "TipoBotonIa" AS ENUM ('IDEAS_CONTENIDO', 'COPYWRITING', 'CARRUSEL', 'HOOKS', 'ESTRATEGIA_MENSUAL', 'FODA', 'BUYER_PERSONA', 'PILARES', 'CAMPANA', 'ANALISIS_METRICAS', 'OTRO');

-- CreateTable
CREATE TABLE "generaciones_ia" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "clienteId" TEXT,
    "estrategiaId" TEXT,
    "tipoBoton" "TipoBotonIa" NOT NULL,
    "instruccion" TEXT NOT NULL,
    "salida" JSONB NOT NULL,
    "modelo" TEXT NOT NULL,
    "tokensEntrada" INTEGER NOT NULL DEFAULT 0,
    "tokensSalida" INTEGER NOT NULL DEFAULT 0,
    "tokensCacheCreacion" INTEGER NOT NULL DEFAULT 0,
    "tokensCacheLectura" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generaciones_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generaciones_ia_organizacionId_idx" ON "generaciones_ia"("organizacionId");

-- CreateIndex
CREATE INDEX "generaciones_ia_clienteId_idx" ON "generaciones_ia"("clienteId");

-- CreateIndex
CREATE INDEX "generaciones_ia_tipoBoton_idx" ON "generaciones_ia"("tipoBoton");

-- AddForeignKey
ALTER TABLE "generaciones_ia" ADD CONSTRAINT "generaciones_ia_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
