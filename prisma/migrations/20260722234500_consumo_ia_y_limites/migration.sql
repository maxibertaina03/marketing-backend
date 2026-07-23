-- Fase 6, bloque B: consumo de IA acumulado y límites por organización.

ALTER TABLE "organizaciones" ADD COLUMN "limiteMarcas" INTEGER;
ALTER TABLE "organizaciones" ADD COLUMN "limiteUsuariosInternos" INTEGER;
ALTER TABLE "organizaciones" ADD COLUMN "limiteGeneracionesIa" INTEGER;
ALTER TABLE "organizaciones" ADD COLUMN "limiteIaPorUsuario" INTEGER;

-- Nullable: las generaciones anteriores a la Fase 6 no registraban quién las pidió.
ALTER TABLE "generaciones_ia" ADD COLUMN "usuarioId" TEXT;
CREATE INDEX "generaciones_ia_organizacionId_usuarioId_creadoEn_idx" ON "generaciones_ia"("organizacionId", "usuarioId", "creadoEn");

CREATE TABLE "consumos_ia" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "generaciones" INTEGER NOT NULL DEFAULT 0,
    "tokensEntrada" INTEGER NOT NULL DEFAULT 0,
    "tokensSalida" INTEGER NOT NULL DEFAULT 0,
    "tokensCacheEscritura" INTEGER NOT NULL DEFAULT 0,
    "tokensCacheLectura" INTEGER NOT NULL DEFAULT 0,
    "costoUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "avisadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumos_ia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "consumos_ia_periodo_idx" ON "consumos_ia"("periodo");
CREATE UNIQUE INDEX "consumos_ia_organizacionId_periodo_key" ON "consumos_ia"("organizacionId", "periodo");
ALTER TABLE "consumos_ia" ADD CONSTRAINT "consumos_ia_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sembrar el período actual con lo ya consumido, para que el contador no arranque
-- en cero sobre agencias que ya vienen usando la IA.
-- El costo se calcula por fila con los precios de cada modelo (USD por millón de
-- tokens, iguales a los de `src/ia/precios.ts`) antes de agregar, porque un mismo
-- período puede mezclar modelos. Un modelo sin precio conocido suma 0.
INSERT INTO "consumos_ia" ("id", "organizacionId", "periodo", "generaciones", "tokensEntrada", "tokensSalida", "tokensCacheEscritura", "tokensCacheLectura", "costoUsd", "actualizadoEn")
SELECT
    gen_random_uuid()::text,
    "organizacionId",
    to_char("creadoEn", 'YYYY-MM'),
    COUNT(*),
    SUM("tokensEntrada"),
    SUM("tokensSalida"),
    SUM("tokensCacheCreacion"),
    SUM("tokensCacheLectura"),
    SUM(
        CASE
            WHEN "modelo" LIKE 'claude-haiku-4-5%' THEN
                ("tokensEntrada" * 1.0 + "tokensSalida" * 5.0 + "tokensCacheCreacion" * 1.25 + "tokensCacheLectura" * 0.1)
            WHEN "modelo" = 'claude-opus-4-8' THEN
                ("tokensEntrada" * 5.0 + "tokensSalida" * 25.0 + "tokensCacheCreacion" * 6.25 + "tokensCacheLectura" * 0.5)
            WHEN "modelo" = 'claude-sonnet-5' THEN
                ("tokensEntrada" * 2.0 + "tokensSalida" * 10.0 + "tokensCacheCreacion" * 2.5 + "tokensCacheLectura" * 0.2)
            ELSE 0
        END
    ) / 1000000,
    CURRENT_TIMESTAMP
FROM "generaciones_ia"
GROUP BY "organizacionId", to_char("creadoEn", 'YYYY-MM');
