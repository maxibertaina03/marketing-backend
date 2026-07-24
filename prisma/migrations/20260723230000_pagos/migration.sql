-- Fase 6, Sprint 3: pagos de suscripción con Mercado Pago.

CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "plan" "PlanSuscripcion" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "referencia" TEXT NOT NULL,
    "mpPagoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pagos_referencia_key" ON "pagos"("referencia");
CREATE INDEX "pagos_organizacionId_idx" ON "pagos"("organizacionId");
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
