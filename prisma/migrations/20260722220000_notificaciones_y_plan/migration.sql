-- Fase 6: centro de notificaciones y plan comercial por organización.

CREATE TYPE "PlanSuscripcion" AS ENUM ('PRUEBA', 'STARTER', 'AGENCY', 'AGENCY_PRO', 'ENTERPRISE');

CREATE TYPE "TipoNotificacion" AS ENUM (
    'APROBACIONES_PENDIENTES',
    'PUBLICACION_APROBADA',
    'PUBLICACION_RECHAZADA',
    'DIAS_SIN_PUBLICAR',
    'CAMPANA_POR_TERMINAR',
    'TAREA_ASIGNADA',
    'INSTAGRAM_DESCONECTADO',
    'CUOTA_IA_CERCA',
    'CUOTA_IA_AGOTADA'
);

ALTER TABLE "organizaciones" ADD COLUMN "plan" "PlanSuscripcion" NOT NULL DEFAULT 'PRUEBA';
ALTER TABLE "organizaciones" ADD COLUMN "planExpiraEn" TIMESTAMP(3);

-- Las organizaciones que ya existen no están en prueba: son las nuestras y las de
-- los testers. Se les deja el plan completo para que nada se les corte cuando
-- empiecen a aplicarse los límites.
UPDATE "organizaciones" SET "plan" = 'AGENCY_PRO';

CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "membresiaId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "clave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT,
    "enlace" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "leidaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notificaciones_organizacionId_idx" ON "notificaciones"("organizacionId");
CREATE INDEX "notificaciones_membresiaId_leida_creadoEn_idx" ON "notificaciones"("membresiaId", "leida", "creadoEn");
CREATE INDEX "notificaciones_membresiaId_clave_leida_idx" ON "notificaciones"("membresiaId", "clave", "leida");
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "membresias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
