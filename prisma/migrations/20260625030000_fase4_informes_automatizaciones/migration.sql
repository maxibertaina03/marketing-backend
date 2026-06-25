-- CreateTable: Informe mensual generado por IA para un cliente.
CREATE TABLE "informes" (
    "id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "resumenMetricas" JSONB NOT NULL,
    "analisisIa" JSONB NOT NULL,
    "generacionIaId" TEXT,
    "clienteId" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "informes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Log de ejecuciones de jobs automáticos.
CREATE TABLE "ejecuciones_job" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "resultado" JSONB NOT NULL,
    "ejecutadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ejecuciones_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "informes_clienteId_periodo_key" ON "informes"("clienteId", "periodo");

-- CreateIndex
CREATE INDEX "informes_organizacionId_idx" ON "informes"("organizacionId");

-- CreateIndex
CREATE INDEX "informes_clienteId_idx" ON "informes"("clienteId");

-- CreateIndex
CREATE INDEX "informes_periodo_idx" ON "informes"("periodo");

-- CreateIndex
CREATE INDEX "ejecuciones_job_tipo_idx" ON "ejecuciones_job"("tipo");

-- AddForeignKey
ALTER TABLE "informes" ADD CONSTRAINT "informes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes" ADD CONSTRAINT "informes_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
