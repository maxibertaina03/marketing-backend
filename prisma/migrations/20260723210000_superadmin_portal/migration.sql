-- Fase 6, bloque C: portal de superadministración.

ALTER TABLE "organizaciones" ADD COLUMN "suspendida" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "auditoria_admin" (
    "id" TEXT NOT NULL,
    "superadmin" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "detalle" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_admin_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "auditoria_admin_organizacionId_idx" ON "auditoria_admin"("organizacionId");
CREATE INDEX "auditoria_admin_superadmin_idx" ON "auditoria_admin"("superadmin");
