-- CreateEnum
CREATE TYPE "TipoTarea" AS ENUM ('REDACCION', 'DISENO', 'EDICION', 'PROGRAMACION', 'REVISION', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'EN_CURSO', 'BLOQUEADA', 'HECHA');

-- CreateEnum
CREATE TYPE "TipoArchivo" AS ENUM ('IMAGEN', 'VIDEO', 'DOCUMENTO', 'AUDIO', 'OTRO');

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoTarea" NOT NULL DEFAULT 'OTRO',
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "fechaLimite" TIMESTAMP(3),
    "publicacionId" TEXT NOT NULL,
    "asignadoId" TEXT,
    "organizacionId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" "TipoArchivo" NOT NULL DEFAULT 'OTRO',
    "tamanoBytes" INTEGER,
    "clienteId" TEXT NOT NULL,
    "publicacionId" TEXT,
    "organizacionId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tareas_organizacionId_idx" ON "tareas"("organizacionId");

-- CreateIndex
CREATE INDEX "tareas_publicacionId_idx" ON "tareas"("publicacionId");

-- CreateIndex
CREATE INDEX "tareas_asignadoId_idx" ON "tareas"("asignadoId");

-- CreateIndex
CREATE INDEX "tareas_estado_idx" ON "tareas"("estado");

-- CreateIndex
CREATE INDEX "archivos_organizacionId_idx" ON "archivos"("organizacionId");

-- CreateIndex
CREATE INDEX "archivos_clienteId_idx" ON "archivos"("clienteId");

-- CreateIndex
CREATE INDEX "archivos_publicacionId_idx" ON "archivos"("publicacionId");

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "publicaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "membresias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "publicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
